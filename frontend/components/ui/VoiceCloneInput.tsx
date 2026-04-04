'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';

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
  const recordStartedAtRef = useRef<number>(0);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [recordSeconds, setRecordSeconds] = useState(0);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!isRecording) return undefined;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordStartedAtRef.current) / 1000);
      setRecordSeconds(Math.max(0, elapsed));
    }, 200);
    return () => clearInterval(id);
  }, [isRecording]);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage('');

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl(URL.createObjectURL(file));

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

  const startRecording = async () => {
    try {
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const supportedMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = supportedMime ? new MediaRecorder(stream, { mimeType: supportedMime }) : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const elapsed = Math.floor((Date.now() - recordStartedAtRef.current) / 1000);
        setRecordSeconds(elapsed);

        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const extension = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const fileName = `voice-sample-${Date.now()}.${extension}`;

        if (elapsed < 6 || blob.size < 12000) {
          setErrorMessage('Recording is too short. Please record at least 6-10 seconds in a quiet environment.');
          onAudioChange(null);
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }

        const objectUrl = URL.createObjectURL(blob);
        setAudioUrl(objectUrl);

        try {
          const dataUrl = await blobToDataUrl(blob);
          onAudioChange({
            audioBase64: dataUrl,
            fileName,
            mimeType
          });
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : 'Recording processing failed.');
          onAudioChange(null);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recordStartedAtRef.current = Date.now();
      setRecordSeconds(0);
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
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl('');
    setErrorMessage('');
    setRecordSeconds(0);
    onAudioChange(null);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-black/20 p-4">
      <p className="text-sm text-gray-300">Upload an audio sample or record directly for voice cloning (recommended 10-30 seconds).</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || isRecording}
          onClick={startRecording}
          className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
        >
          Start Recording
        </button>
        <button
          type="button"
          disabled={disabled || !isRecording}
          onClick={stopRecording}
          className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
        >
          Stop Recording
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={clearAudio}
          className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      {isRecording ? <p className="text-xs text-emerald-300">Recording: {recordSeconds}s</p> : null}

      <input
        type="file"
        accept="audio/*"
        disabled={disabled}
        onChange={handleFileUpload}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm"
      />

      {audioUrl ? <audio controls src={audioUrl} className="w-full" /> : null}
      {errorMessage ? <p className="text-sm text-red-300">{errorMessage}</p> : null}
    </div>
  );
}
