import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodeBuildHubAccessComServiceStack } from './codebuild';
import { EcsPipelineStack } from './ecs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class HubAccessComInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const codeBuild = new CodeBuildHubAccessComServiceStack(scope,'CodeBuildHubAccessComServiceStack',props)
    const ecs = new EcsPipelineStack(scope,'EcsPipelineStack',props)
  }
}
