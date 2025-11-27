import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
// import { data } from "./data/resource"; // Data resource арилгасан - AppSync permissions асуудал гарч байгаа тул
import { rekognitionLivenessFunction } from "./functions/rekognition-liveness/resource";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

const backend = defineBackend({
  auth,
  // data, // Data resource арилгасан - зөвхөн Face Liveness demo хийх тул шаардлагагүй
  rekognitionLivenessFunction,
});

// IAM permissions нэмэх - Rekognition-д хандах эрх (Lambda function-д)
backend.rekognitionLivenessFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      "rekognition:CreateFaceLivenessSession",
      "rekognition:GetFaceLivenessSessionResults",
    ],
    resources: ["*"],
  })
);

// IAM permissions нэмэх - Unauthenticated Cognito identity role-д
// FaceLivenessDetector component нь Rekognition-д шууд stream хийхэд энэ permission шаардлагатай
backend.auth.resources.unauthenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: [
      "rekognition:StartFaceLivenessSession",
      "rekognition:CreateFaceLivenessSession",
    ],
    resources: ["*"],
  })
);

// IAM permissions нэмэх - Authenticated Cognito identity role-д (optional, хэрэв authenticated user ашиглах бол)
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: [
      "rekognition:StartFaceLivenessSession",
      "rekognition:CreateFaceLivenessSession",
    ],
    resources: ["*"],
  })
);
