# Quick Start - AWS Console ашиглах (Хамгийн хялбар арга)

Хэрэв Amplify permissions асуудалтай бол, энэ арга нь илүү хялбар, бага permissions шаарддаг.

## Алхам 1: Lambda Function үүсгэх

1. AWS Console нээх: https://console.aws.amazon.com/lambda
2. **Functions** → **Create function**
3. Тохиргоо:
   - Function name: `rekognition-liveness`
   - Runtime: **Node.js 20.x**
   - Architecture: **x86_64**
4. **Create function** товч дарах

## Алхам 2: Code оруулах

1. Lambda function-д орох
2. **Code** tab сонгох
3. `index.mjs` файлыг дараах код-оор солих:

```javascript
import {
  RekognitionClient,
  CreateFaceLivenessSessionCommand,
  GetFaceLivenessSessionResultsCommand,
} from "@aws-sdk/client-rekognition";

const rekognitionClient = new RekognitionClient({
  region: process.env.REGION || "us-east-1",
});

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  // OPTIONS request-д зөв response буцаах (CORS preflight)
  if (event.requestContext?.http?.method === "OPTIONS" || event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify({}),
    };
  }

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
      const command = new CreateFaceLivenessSessionCommand({});

      const response = await rekognitionClient.send(command);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
        body: JSON.stringify({
          sessionId: response.SessionId,
          stream: response.StreamSessionOutput || null,
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
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
        body: JSON.stringify({
          status: response.Status,
          confidence: response.Confidence,
          auditImages: response.AuditImages,
        }),
      };
    }

    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Invalid action" }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: error.message || "Internal server error",
      }),
    };
  }
};
```

4. **Deploy** товч дарах

## Алхам 3: Dependencies нэмэх

1. Lambda function → **Code** tab
2. **Add a layer** эсвэл **Upload from** → **.zip file**
3. Эсвэл **Configuration** → **Layers** → **Add a layer**
4. AWS SDK нь Lambda runtime-д аль хэдийн байгаа тул нэмэлт layer шаардлагагүй

**Анхаар:** Node.js 20.x runtime-д `@aws-sdk/client-rekognition` аль хэдийн байгаа.

## Алхам 4: Function URL идэвхжүүлэх

1. Lambda function → **Configuration** tab
2. **Function URL** сонгох
3. **Create function URL** товч дарах
4. Тохиргоо:
   - Auth type: **AWS_IAM** (эсвэл **NONE** хэрэв public бол)
   - CORS: **Enable** (optional)
5. **Save** товч дарах
6. **Function URL**-г хуулах (жишээ: `https://abc123.lambda-url.us-east-1.on.aws/`)

## Алхам 5: IAM Permissions нэмэх

1. Lambda function → **Configuration** → **Permissions**
2. **Execution role** дээр дарах (жишээ: `rekognition-liveness-role-xxx`)
3. **Add permissions** → **Create inline policy**
4. **JSON** tab сонгох
5. Дараах JSON оруулах:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:CreateFaceLivenessSession",
        "rekognition:GetFaceLivenessSessionResults"
      ],
      "Resource": "*"
    }
  ]
}
```

6. **Next** → **Create policy**

## Алхам 6: Environment Variable тохируулах

1. Project root directory-д `.env.local` файл үүсгэх:

```bash
# Terminal-д
cd /Users/myagmarsuren/Documents/mobicom/aws/amplify-vite-react-template
echo "VITE_REKOGNITION_FUNCTION_URL=https://your-function-url.lambda-url.us-east-1.on.aws/" > .env.local
```

2. Function URL-г дээрх файлд оруулах (AWS Console-оос хуулсан URL)

## Алхам 7: Frontend ажиллуулах

```bash
# Dependencies суулгах
npm install

# Development server ажиллуулах
npm run dev
```

Browser дээр `http://localhost:5173` нээх.

## Алхам 8: Test хийх

1. Browser дээр app нээх
2. Sign up / Sign in хийх (email authentication)
3. "Start Face Liveness Check" товч дарах
4. Session ID харагдана
5. "Get Results" товч дарах - Liveness check-ийн үр дүнг харах

## Асуудал гарвал

1. **Function URL олдохгүй байна:**
   - `.env.local` файл байгаа эсэхийг шалгах
   - Function URL зөв байгаа эсэхийг шалгах

2. **CORS алдаа:**
   - Lambda function-д CORS headers байгаа эсэхийг шалгах
   - Function URL-ийн auth type-г `NONE` болгох (development-д)

3. **Rekognition permissions алдаа:**
   - IAM role-д Rekognition permissions байгаа эсэхийг шалгах
   - CloudWatch Logs-д алдааны мэдээлэл харах

## Давуу тал

- Amplify deploy хийх шаардлагагүй
- Бага permissions шаарддаг
- Хурдан ажиллана
- AWS Console-оос шууд удирдах боломжтой

