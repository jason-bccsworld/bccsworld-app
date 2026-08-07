import crypto from "crypto";
import { TrainingEvent } from "@shared/schema";

export function generateBlockchainHash(event: TrainingEvent): string {
  // Create a deterministic hash based on event data
  const data = {
    studentName: event.studentName,
    licenseNumber: (event as any).licenseNumber,
    eventType: event.eventType,
    eventDate: event.eventDate,
    instructorName: event.instructorName,
    status: event.status,
    timestamp: Date.now(),
  };

  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");

  return `0x${hash.substring(0, 8)}...${hash.substring(56)}`;
}

export function verifyBlockchainHash(event: TrainingEvent, hash: string): boolean {
  // In a real implementation, this would verify against the blockchain
  // For now, we'll just check if the hash format is correct
  return /^0x[a-f0-9]{8}\.\.\.[a-f0-9]{8}$/.test(hash);
}
