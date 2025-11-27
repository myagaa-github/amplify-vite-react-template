import { defineFunction } from "@aws-amplify/backend";

export const rekognitionLivenessFunction = defineFunction({
  name: "rekognition-liveness",
  entry: "./handler.ts",
  environment: {
    REGION: "us-east-1",
  },
  runtime: 20,
  timeoutSeconds: 30,
  memoryMB: 512,
});
