import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam'

export class CodeBuildHubAccessComServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const codeBuildRole = new iam.Role(this, 'CodeBuildRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
    });

    codeBuildRole.addToPolicy(new iam.PolicyStatement({
      actions: ["ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:GetAuthorizationToken",
      "ecr:UploadLayerPart"],
      resources: ['*']
    }));

    codeBuildRole.addToPolicy(new iam.PolicyStatement({
      actions: ["logs:*"],
      resources: ['*']
    }));

    const project = new codebuild.Project(this, 'HubAccessComService', {
      projectName: 'HubAccessComService',
      environment: {
        buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
        privileged: false,
        computeType: codebuild.ComputeType.SMALL
      },
      role: codeBuildRole,
      buildSpec: codebuild.BuildSpec.fromSourceFilename('configuration/buildspec.yml'),
      source: codebuild.Source.gitHub({
        owner: 'nanofaroque',
        repo: 'HubAccessComService',
        webhook: true, // optional, default: true if `webhookFilters` were provided, false otherwise
        webhookTriggersBatchBuild: false, // optional, default is false
        webhookFilters: [
          codebuild.FilterGroup
            .inEventOf(codebuild.EventAction.PUSH, codebuild.EventAction.PULL_REQUEST_MERGED)
            .andBranchIs('main'),
        ], 
      })
    });
  }
}