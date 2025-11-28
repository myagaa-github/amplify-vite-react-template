import {
  RekognitionClient,
  CreateFaceLivenessSessionCommand,
  GetFaceLivenessSessionResultsCommand,
} from "@aws-sdk/client-rekognition";

interface LambdaEvent {
  body?: string | Record<string, unknown>;
  [key: string]: unknown;
}

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const rekognitionClient = new RekognitionClient({
  region: process.env.REGION || "us-east-1",
});

export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  console.log("Event:", JSON.stringify(event, null, 2));

  // Lambda Function URL-ийн CORS configuration автоматаар CORS headers нэмдэг
  // Тиймээс handler-д CORS headers нэмэх шаардлагагүй
  // OPTIONS request-г мөн Lambda Function URL автоматаар handle хийж байна
  // Зөвхөн Content-Type header нэмэх
  const responseHeaders = {
    "Content-Type": "application/json",
  };

  // Amplify Gen 2-д event format өөр байж болно
  let body;
  if (event.body) {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } else {
    body = event;
  }

  try {
    const { action, sessionId } = body;

    if (action === "createSession") {
      // Create Face Liveness Session
      const command = new CreateFaceLivenessSessionCommand({
        // Settings нь optional, хэрэв S3 bucket байхгүй бол арилгах
        // Settings: {
        //   OutputConfig: {
        //     S3Bucket: process.env.S3_BUCKET_NAME,
        //     S3KeyPrefix: "liveness-sessions/",
        //   },
        // },
      });

      const response = await rekognitionClient.send(command);

      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify({
          sessionId: response.SessionId,
          // StreamSessionOutput нь optional байж болно
          stream:
            (response as { StreamSessionOutput?: unknown })
              .StreamSessionOutput || null,
        }),
      };
    }

    if (action === "getResults" && sessionId) {
      // Get Face Liveness Results
      const command = new GetFaceLivenessSessionResultsCommand({
        SessionId: sessionId,
      });

      const response = await rekognitionClient.send(command);

      // AuditImages-ийн Uint8Array-г base64 string болгон хөрвүүлэх
      const processedAuditImages = response.AuditImages?.map((image) => {
        if (image.Bytes && image.Bytes instanceof Uint8Array) {
          // Uint8Array-г base64 string болгон хөрвүүлэх
          const bytes = image.Bytes;
          // Buffer ашиглах (Node.js runtime-д байдаг)
          const base64 = Buffer.from(bytes).toString("base64");
          return {
            ...image,
            Bytes: base64,
          };
        }
        // Хэрэв аль хэдийн string эсвэл бусад формат байвал шууд буцаах
        return image;
      });

      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify({
          status: response.Status,
          confidence: response.Confidence,
          auditImages: processedAuditImages || response.AuditImages,
        }),
      };
    }

    return {
      statusCode: 400,
      headers: responseHeaders,
      body: JSON.stringify({ error: "Invalid action" }),
    };
  } catch (error) {
    console.error("Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({
        error: errorMessage,
      }),
    };
  }
};
