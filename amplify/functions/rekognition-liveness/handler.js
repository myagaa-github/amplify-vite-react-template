/* eslint-env node */
/* eslint-disable no-undef */
import {
  RekognitionClient,
  CreateFaceLivenessSessionCommand,
  GetFaceLivenessSessionResultsCommand,
} from "@aws-sdk/client-rekognition";

const rekognitionClient = new RekognitionClient({
  region: process.env.REGION || "us-east-1",
});

export const handler = async (event) => {
  const requestId = event.requestContext?.requestId || "unknown";
  console.log("=== Lambda Function Started ===");
  console.log("Request ID:", requestId);
  console.log("Event received:", JSON.stringify(event, null, 2));
  console.log("Environment:", {
    REGION: process.env.REGION,
    NODE_VERSION: process.version,
  });

  const responseHeaders = {
    "Content-Type": "application/json",
  };

  let body;
  try {
    if (event.body) {
      body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } else {
      body = event;
    }
  } catch (parseError) {
    console.error("Error parsing body:", parseError);
    return {
      statusCode: 400,
      headers: responseHeaders,
      body: JSON.stringify({
        error: "Invalid JSON in request body",
      }),
    };
  }

  try {
    const { action, sessionId } = body || {};
    console.log("Action:", action);
    console.log("SessionId:", sessionId);

    if (action === "createSession") {
      console.log("Creating Face Liveness Session...");
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
      console.log("Session created successfully:", {
        sessionId: response.SessionId,
        hasStream: !!response.StreamSessionOutput,
      });
      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify({
          sessionId: response.SessionId,
          // StreamSessionOutput нь optional байж болно
          stream: response.StreamSessionOutput || null,
        }),
      };
    }
    if (action === "getResults" && sessionId) {
      if (!sessionId || typeof sessionId !== "string") {
        console.error("Invalid sessionId:", sessionId);
        return {
          statusCode: 400,
          headers: responseHeaders,
          body: JSON.stringify({
            error: "Invalid sessionId",
          }),
        };
      }

      console.log("Getting Face Liveness Results for sessionId:", sessionId);
      const command = new GetFaceLivenessSessionResultsCommand({
        SessionId: sessionId,
      });
      console.log("Sending command to Rekognition...");
      const response = await rekognitionClient.send(command);
      console.log("Rekognition API call completed");

      console.log("Rekognition response received:", {
        status: response.Status,
        confidence: response.Confidence,
        hasAuditImages: !!response.AuditImages,
        auditImagesCount: response.AuditImages?.length || 0,
        auditImagesType: response.AuditImages
          ? typeof response.AuditImages
          : "null",
        isArray: Array.isArray(response.AuditImages),
      });

      // AuditImages-ийн Uint8Array-г base64 string болгон хөрвүүлэх
      let processedAuditImages = null;
      if (response.AuditImages && Array.isArray(response.AuditImages)) {
        console.log(
          `Processing ${response.AuditImages.length} audit images...`
        );
        try {
          processedAuditImages = response.AuditImages.map((image, index) => {
            if (!image) {
              console.log(`Image ${index} is null or undefined`);
              return image;
            }

            console.log(`Processing image ${index}:`, {
              hasBytes: !!image.Bytes,
              bytesType: image.Bytes ? typeof image.Bytes : "null",
              isUint8Array: image.Bytes instanceof Uint8Array,
              bytesLength:
                image.Bytes instanceof Uint8Array ? image.Bytes.length : "N/A",
            });

            if (image.Bytes && image.Bytes instanceof Uint8Array) {
              try {
                // Uint8Array-г base64 string болгон хөрвүүлэх
                const bytes = image.Bytes;
                console.log(
                  `Converting image ${index} Uint8Array to base64 (${bytes.length} bytes)...`
                );
                const base64 = Buffer.from(bytes).toString("base64");
                console.log(
                  `Image ${index} converted successfully, base64 length: ${base64.length}`
                );
                return {
                  ...image,
                  Bytes: base64,
                };
              } catch (bufferError) {
                console.error(
                  `Error converting image ${index} Uint8Array to base64:`,
                  bufferError.message,
                  bufferError.stack
                );
                // Хэрэв хөрвүүлэх боломжгүй бол original image буцаах
                return image;
              }
            }
            // Хэрэв аль хэдийн string эсвэл бусад формат байвал шууд буцаах
            console.log(`Image ${index} is not Uint8Array, returning as-is`);
            return image;
          });
          console.log(
            `Successfully processed ${processedAuditImages.length} images`
          );
        } catch (mapError) {
          console.error(
            "Error processing audit images:",
            mapError.message,
            mapError.stack
          );
          // Хэрэв map алдаа гарвал original images ашиглах
          processedAuditImages = response.AuditImages;
        }
      } else {
        console.log("No audit images to process or not an array");
      }

      const finalResponse = {
        status: response.Status,
        confidence: response.Confidence,
        auditImages: processedAuditImages || response.AuditImages || [],
      };
      console.log("Final response prepared:", {
        status: finalResponse.status,
        confidence: finalResponse.confidence,
        auditImagesCount: finalResponse.auditImages.length,
      });
      console.log("=== Lambda Function Completed Successfully ===");
      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify(finalResponse),
      };
    }
    console.error("Invalid action:", action);
    return {
      statusCode: 400,
      headers: responseHeaders,
      body: JSON.stringify({ error: "Invalid action" }),
    };
  } catch (error) {
    console.error("=== Lambda Function Error ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    if (error.code) {
      console.error("Error code:", error.code);
    }
    if (error.$metadata) {
      console.error(
        "AWS SDK metadata:",
        JSON.stringify(error.$metadata, null, 2)
      );
    }
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
        ? error
        : "Internal server error";

    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      }),
    };
  }
};
