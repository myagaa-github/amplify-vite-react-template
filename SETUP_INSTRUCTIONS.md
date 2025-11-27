# AWS Face Rekognition Liveness Demo - Ажиллуулах заавар

## Алхам 1: Dependencies суулгах

```bash
# Root directory-д
npm install
```

## Алхам 2: Backend Deploy хийх (2 сонголт)

### Сонголт A: Amplify Gen 2 ашиглах (Permissions шаардлагатай)

```bash
npx ampx sandbox
```

Энэ командыг ажиллуулахад:
- Lambda function үүсэх
- IAM permissions тохируулагдах
- `amplify_outputs.json` файл шинэчлэгдэх
- Function URL үүсэх

**Анхаар:** Энэ арга нь CloudFormation, S3, SSM permissions шаарддаг.

### Сонголт B: AWS Console ашиглах (Хамгийн хялбар - Зөвлөмж)

Хэрэв Amplify permissions асуудалтай бол, AWS Console-оос шууд хийх:

1. **Lambda Function үүсгэх:**
   - AWS Console → Lambda → Functions → Create function
   - Function name: `rekognition-liveness`
   - Runtime: Node.js 20.x
   - Create function

2. **Code оруулах:**
   - `amplify/functions/rekognition-liveness/handler.ts` файлын код-г Lambda function-д хуулах

3. **Function URL идэвхжүүлэх:**
   - Lambda function → Configuration → Function URL
   - Create function URL
   - Auth type: `AWS_IAM` (эсвэл `NONE` хэрэв public бол)
   - Function URL-г хуулах

4. **IAM Role-д Rekognition permissions нэмэх:**
   - Lambda function → Configuration → Permissions
   - Execution role → Add permissions → Create inline policy
   - JSON:
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

5. **Environment Variable тохируулах:**
   - Project root-д `.env.local` файл үүсгэх:
   ```bash
   echo "VITE_REKOGNITION_FUNCTION_URL=https://your-function-url.lambda-url.us-east-1.on.aws/" > .env.local
   ```
   - Function URL-г дээрх файлд оруулах

## Алхам 3: Frontend ажиллуулах

Backend deploy хийсний дараа `amplify_outputs.json` файл шинэчлэгдэнэ. Дараа нь:

```bash
# Development server ажиллуулах
npm run dev
```

Browser дээр `http://localhost:5173` (эсвэл Vite-ийн өөр port) нээх.

## Алхам 4: Authentication

1. Browser дээр app нээх
2. Sign up / Sign in хийх (email authentication ашиглана)
3. "Start Face Liveness Check" товч дарах

## Алхам 5: Face Liveness Check хийх

1. Session үүсэх - Lambda function-аас Rekognition session үүсгэнэ
2. Session ID харагдана
3. "Get Results" товч дарах - Liveness check-ийн үр дүнг харах

## Асуудал гарвал шалгах зүйлс:

### 1. Function URL олдохгүй байгаа эсэх

**Сонголт A: Environment Variable ашиглах (Зөвлөмж)**
```bash
# .env.local файл үүсгэх
echo "VITE_REKOGNITION_FUNCTION_URL=https://your-function-url.lambda-url.us-east-1.on.aws/" > .env.local
```

**Сонголт B: Amplify outputs шалгах**
```bash
# amplify_outputs.json файл шалгах
cat amplify_outputs.json
```

Файлд `custom.rekognitionLivenessFunction` байх ёстой.

### 2. Lambda function URL зөв байгаа эсэх
Browser console (F12) нээж, function URL харагдах ёстой. Хэрэв алдаа гарвал `.env.local` файл шалгах.

### 3. IAM Permissions
Lambda function-д дараах permissions байх ёстой:
- `rekognition:CreateFaceLivenessSession`
- `rekognition:GetFaceLivenessSessionResults`

### 4. Region
Rekognition Face Liveness дэмжигдсэн region-үүд:
- us-east-1 (N. Virginia)
- us-west-2 (Oregon)
- eu-west-1 (Ireland)
- ap-southeast-1 (Singapore)

Одоогийн тохиргоо: `us-east-1`

### 5. Browser Console алдаа
Browser console (F12) нээж, алдаа байгаа эсэхийг шалгах.

## Файлуудын бүтэц:

```
amplify/
├── functions/
│   └── rekognition-liveness/
│       ├── handler.ts          # Lambda function handler
│       ├── resource.ts          # Function definition
│       └── package.json         # Function dependencies
├── backend.ts                   # Backend configuration + IAM permissions
└── auth/
    └── resource.ts              # Auth configuration

src/
├── component/
│   └── FaceLivenessDemo.tsx    # Frontend component
├── App.tsx                      # Main app
└── main.tsx                     # Entry point
```

## Дараагийн алхмууд:

1. **AWS Rekognition Face Liveness SDK нэмэх**: Browser-д WebRTC ашиглан liveness check хийх
2. **Video stream харах**: Camera access авах, video stream харуулах
3. **Results боловсруулах**: Liveness check-ийн үр дүнг илүү сайн харуулах

## Тэмдэглэл:

- Одоогийн implementation нь session үүсгэх, results авах функц ажиллаж байна
- Browser-д video stream харуулах, WebRTC connection үүсгэх хэсэг нь дараагийн алхам
- AWS Rekognition Face Liveness SDK-г browser-д ашиглахын тулд нэмэлт library суулгах шаардлагатай

