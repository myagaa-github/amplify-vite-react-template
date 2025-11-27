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

// IAM permissions нэмэх - Rekognition-д хандах эрх
backend.rekognitionLivenessFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      "rekognition:CreateFaceLivenessSession",
      "rekognition:GetFaceLivenessSessionResults",
    ],
    resources: ["*"],
  })
);
