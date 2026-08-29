export interface SseMessage {
  event: string;
  data: string;
}

export interface SseParser {
  push: (chunk: string) => void;
  finish: () => void;
}

function parseEventBlock(block: string): SseMessage | null {
  let event = "message";
  const dataLines: string[] = [];

  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;

    const separatorIndex = line.indexOf(":");
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    let value = separatorIndex === -1 ? "" : line.slice(separatorIndex + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") {
      event = value;
    } else if (field === "data") {
      dataLines.push(value);
    }
  }

  if (dataLines.length === 0 && event === "message") return null;
  return { event, data: dataLines.join("\n") };
}

export function createSseParser(
  onMessage: (message: SseMessage) => void,
): SseParser {
  let buffer = "";

  const drain = (flush: boolean) => {
    while (buffer.length > 0) {
      const separator = /\r?\n\r?\n/.exec(buffer);
      if (!separator) break;

      const block = buffer.slice(0, separator.index);
      buffer = buffer.slice(separator.index + separator[0].length);
      const message = parseEventBlock(block);
      if (message) onMessage(message);
    }

    if (flush && buffer.trim()) {
      const message = parseEventBlock(buffer);
      buffer = "";
      if (message) onMessage(message);
    }
  };

  return {
    push: (chunk) => {
      buffer += chunk;
      drain(false);
    },
    finish: () => drain(true),
  };
}
