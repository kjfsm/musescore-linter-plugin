import { FileMusic, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const ACCEPT = ".musicxml,.xml,.mxl";

export interface DropzoneProps {
	onFiles: (files: File[]) => void;
	busy: boolean;
}

export function Dropzone({ onFiles, busy }: DropzoneProps) {
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [over, setOver] = useState(false);

	function take(list: FileList | null) {
		const files = [...(list ?? [])];
		if (files.length > 0) onFiles(files);
	}

	return (
		<div
			// biome/oxlint ともに静的解析では拾えないが、キーボード操作は下のボタンと
			// file input が担うので、この div 自体はマウス操作専用でよい。
			onDragOver={(e) => {
				e.preventDefault();
				setOver(true);
			}}
			onDragLeave={() => setOver(false)}
			onDrop={(e) => {
				e.preventDefault();
				setOver(false);
				take(e.dataTransfer.files);
			}}
			className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
				over ? "border-primary bg-primary/5" : "border-border bg-card"
			}`}
		>
			<FileMusic className="size-8 text-muted-foreground" aria-hidden />
			<div>
				<p className="font-medium">MusicXML をここにドロップ</p>
				<p className="text-sm text-muted-foreground">
					.musicxml / .xml / .mxl（複数可）
				</p>
			</div>
			<Button
				type="button"
				variant="outline"
				disabled={busy}
				onClick={() => inputRef.current?.click()}
			>
				<Upload />
				ファイルを選ぶ
			</Button>
			<input
				id={inputId}
				ref={inputRef}
				type="file"
				accept={ACCEPT}
				multiple
				className="hidden"
				onChange={(e) => {
					take(e.target.files);
					// 同じファイルを選び直しても change が飛ぶようにする
					e.target.value = "";
				}}
			/>
		</div>
	);
}
