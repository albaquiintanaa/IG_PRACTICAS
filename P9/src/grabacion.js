// Grabación del canvas a vídeo + audio.

const FORMATOS = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4;codecs=avc1,mp4a",
  "video/mp4",
];

export class Grabadora {
  /**
   * @param {HTMLCanvasElement} canvas  renderer.domElement
   * @param {THREE.AudioListener} listener  oyente de la cámara (o null para grabar sin audio)
   */
  constructor(canvas, listener = null, fps = 30) {
    this.canvas = canvas;
    this.listener = listener;
    this.fps = fps;
    this.recorder = null;
    this.chunks = [];
    this.destinoAudio = null;
    this.indicador = document.getElementById("rec");
  }


  get grabando() {
    return this.recorder !== null && this.recorder.state === "recording";
  }


  alternar() {
    if (this.grabando) this.parar();
    else this.empezar();
  }


  empezar() {
    this.chunks = [];
    const stream = this.canvas.captureStream(this.fps);

    if (this.listener) {
      // Se guarda también el sonido en la grabación
      this.destinoAudio = this.listener.context.createMediaStreamDestination();
      this.listener.getInput().connect(this.destinoAudio);
      for (const pista of this.destinoAudio.stream.getAudioTracks()) stream.addTrack(pista);
    }


    const mimeType = FORMATOS.find((f) => MediaRecorder.isTypeSupported(f));
    const opciones = { videoBitsPerSecond: 8000000 };
    if (mimeType) opciones.mimeType = mimeType;

    this.recorder = new MediaRecorder(stream, opciones);
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.onstop = () => this.descargar(stream);
    this.recorder.start(1000); // un fragmento por segundo
    if (this.indicador) this.indicador.classList.add("activo");
    console.log(`Grabando (${this.recorder.mimeType})... pulsa G para parar.`);
  }


  parar() {
    this.recorder.stop();
    if (this.destinoAudio) {
      this.listener.getInput().disconnect(this.destinoAudio);
      this.destinoAudio = null;
    }
    if (this.indicador) this.indicador.classList.remove("activo");
  }

  
  descargar(stream) {
    stream.getTracks().forEach((t) => t.stop());
    const tipo = this.recorder.mimeType || "video/webm";
    const extension = tipo.includes("mp4") ? "mp4" : "webm";
    const blob = new Blob(this.chunks, { type: tipo });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `taller_juguetes_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${extension}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
