import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { videoPath, casoId } = await req.json();

    if (!videoPath || !casoId) {
      return new Response(JSON.stringify({ error: "Missing videoPath or casoId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download video from Storage
    const { data: videoData, error: downloadError } = await supabase.storage
      .from("videos")
      .download(videoPath);

    if (downloadError || !videoData) {
      console.error("Download error:", downloadError);
      return new Response(JSON.stringify({ error: "Failed to download video from storage" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert blob to FormData for Whisper API
    const formData = new FormData();
    formData.append("file", videoData, "video.mp4");
    formData.append("model", "whisper-1");
    formData.append("language", "es");
    formData.append("response_format", "verbose_json");

    // Call OpenAI Whisper API
    const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const error = await whisperResponse.text();
      console.error("Whisper error:", error);
      return new Response(JSON.stringify({ error: "Whisper API failed", details: error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = (await whisperResponse.json()) as {
      text: string;
      segments?: Array<{ start: number; end: number; text: string }>;
    };

    // Format with timestamps
    let transcription = result.text;
    if (result.segments && result.segments.length > 0) {
      transcription = result.segments
        .map((seg) => {
          const hours = Math.floor(seg.start / 3600);
          const minutes = Math.floor((seg.start % 3600) / 60);
          const seconds = Math.floor(seg.start % 60);
          const timestamp = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
          return `[${timestamp}] ${seg.text.trim()}`;
        })
        .join("\n");
    }

    // Save to documentos table
    const { data: docData, error: docError } = await supabase
      .from("documentos")
      .insert({
        caso_id: casoId,
        nombre: `Transcripción: ${videoPath.split("/").pop()}`,
        tipo: "transcription",
        contenido: transcription,
        idioma: "es-MX",
        timestamps: true,
        storage_path: videoPath,
        tamaño_bytes: videoData.size,
      })
      .select()
      .single();

    if (docError) {
      console.error("Database error:", docError);
      return new Response(JSON.stringify({ error: "Failed to save transcription" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcription,
        documentId: docData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
