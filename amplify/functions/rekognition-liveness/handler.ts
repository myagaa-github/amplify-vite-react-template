import {
  RekognitionClient,
  CreateFaceLivenessSessionCommand,
  GetFaceLivenessSessionResultsCommand,
} from "@aws-sdk/client-rekognition";

const rekognitionClient = new RekognitionClient({
  region: process.env.REGION || "us-east-1",
});

export const handler = async (event: any) => {
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
          stream: (response as any).StreamSessionOutput || null,
        }),
      };
    }

    if (action === "getResults" && sessionId) {
      // Get Face Liveness Results
      const command = new GetFaceLivenessSessionResultsCommand({
        SessionId: sessionId,
      });

      const response = await rekognitionClient.send(command);

      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify({
          status: response.Status,
          confidence: response.Confidence,
          auditImages: response.AuditImages,
        }),
      };
    }

    return {
      statusCode: 400,
      headers: responseHeaders,
      body: JSON.stringify({ error: "Invalid action" }),
    };
  } catch (error: any) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({
        error: error.message || "Internal server error",
      }),
    };
  }
};
