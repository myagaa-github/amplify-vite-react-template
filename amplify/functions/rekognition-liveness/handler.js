// handler.ts
import {
  RekognitionClient,
  CreateFaceLivenessSessionCommand,
  GetFaceLivenessSessionResultsCommand
} from "@aws-sdk/client-rekognition";
var rekognitionClient = new RekognitionClient({
  region: process.env.REGION || "us-east-1"
});
var handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));
  const responseHeaders = {
    "Content-Type": "application/json"
  };
  let body;
  if (event.body) {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } else {
    body = event;
  }
  try {
    const { action, sessionId } = body;
    if (action === "createSession") {
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
          stream: response.StreamSessionOutput || null
        })
      };
    }
    if (action === "getResults" && sessionId) {
      const command = new GetFaceLivenessSessionResultsCommand({
        SessionId: sessionId
      });
      const response = await rekognitionClient.send(command);
      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify({
          status: response.Status,
          confidence: response.Confidence,
          auditImages: response.AuditImages
        })
      };
    }
    return {
      statusCode: 400,
      headers: responseHeaders,
      body: JSON.stringify({ error: "Invalid action" })
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({
        error: error.message || "Internal server error"
      })
    };
  }
};
export {
  handler
};
