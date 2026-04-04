'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Upload, Trash2, FileAudio } from 'lucide-react';

export type VoiceCloneAudioPayload = {
  audioBase64: string;
  fileName: string;
  mimeType: string;
};

type Props = {
  onAudioChange: (payload: VoiceCloneAudioPayload | null) => void;
  disabled?: boolean;
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read audio file.'));
    reader.readAsDataURL(blob);
  });

export default function VoiceCloneInput({ onAudioChange, disabled = false }: Props) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const processFile = async (file: File) => {
    setErrorMessage('');
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
    setFileName(file.name);

    try {
      const dataUrl = await blobToDataUrl(file);
      onAudioChange({
        audioBase64: dataUrl,
        fileName: file.name,
        mimeType: file.type || 'audio/webm'
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Audio processing failed.');
      onAudioChange(null);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      await processFile(file);
    }
  };

  const startRecording = async () => {
    try {
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const name = `voice-sample-${Date.now()}.webm`;
        if (audioUrl) URL.revokeObjectURL(audioUrl);

        const objectUrl = URL.createObjectURL(blob);
        setAudioUrl(objectUrl);
        setFileName(name);

        try {
          const dataUrl = await blobToDataUrl(blob);
          onAudioChange({ audioBase64: dataUrl, fileName: name, mimeType });
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : 'Recording processing failed.');
          onAudioChange(null);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Microphone access denied.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
    setIsRecording(false);
  };

  const clearAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl('');
    setFileName('');
    setErrorMessage('');
    onAudioChange(null);
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all duration-300 ${
          dragActive
            ? 'border-accent bg-accent/5'
            : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
        }`}
      >
        <Upload className={`mx-auto mb-3 h-8 w-8 transition-colors ${dragActive ? 'text-accent' : 'text-muted-dark group-hover:text-muted'}`} />
        <p className="text-sm text-muted">
          <span className="font-medium text-white">Click to upload</span> or drag & drop audio file
        </p>
        <p className="mt-1 text-xs text-muted-dark">MP3, WAV, WebM, OGG — up to 10MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          disabled={disabled}
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* or divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/[0.06]" />
        <span className="text-xs text-muted-dark">or record directly</span>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      {/* Record Buttons */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <motion.button
            type="button"
            disabled={disabled}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startRecording}
            className="flex items-center gap-2 rounded-xl bg-red-500/10 px-5 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            <Mic className="h-4 w-4" />
            Start Recording
          </motion.button>
        ) : (
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={stopRecording}
            className="relative flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-medium text-white"
          >
            {/* Pulse ring */}
            <span className="absolute -inset-1 animate-pulse-ring rounded-xl border-2 border-red-500" />
            <MicOff className="h-4 w-4" />
            Stop Recording
          </motion.button>
        )}

        {audioUrl && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={disabled}
            onClick={clearAudio}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-3 text-sm text-muted transition-colors hover:border-red-400/40 hover:text-red-400 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </motion.button>
        )}
      </div>

      {/* Audio Preview */}
      <AnimatePresence>
        {audioUrl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-xs text-muted">
              <FileAudio className="h-3.5 w-3.5" />
              {fileName}
            </div>
            <audio controls src={audioUrl} className="w-full [&::-webkit-media-controls-panel]:bg-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {errorMessage && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            {errorMessage}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
