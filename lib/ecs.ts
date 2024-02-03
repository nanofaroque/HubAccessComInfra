import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam'

export class EcsPipelineStack extends cdk.Stack {
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
    codeBuildRole.addToPolicy(new iam.PolicyStatement({
      actions: ["s3:*"],
      resources: ['*']
    }));

    const ecrRepository = ecr.Repository.fromRepositoryName(this, 'EcrRepository', 'hubaccesscomservice');

    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');
    const buildProject = new codebuild.PipelineProject(this, 'PipelineProject', {
        buildSpec: codebuild.BuildSpec.fromObject({
            version: 0.2,
            phases: {
                build: {
                    commands: [
                        // https://docs.aws.amazon.com/codepipeline/latest/userguide/file-reference.html#pipelines-create-image-definitions
                    `echo "[{\\"name\\":\\"$CONTAINER_NAME\\",\\"imageUri\\":\\"$REPOSITORY_URI\\"}]" > imagedefinitions.json`,
                    ],
                },
            },
            artifacts: {
                files: ['imagedefinitions.json'],
            },
        }),
        environment: {
            buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
        },
        environmentVariables: {
        // Container name as it exists in the task definition
        CONTAINER_NAME: {
            value: 'hubaccesscomservice',
        },
        // ECR URI
        REPOSITORY_URI: {
        value: ecrRepository.repositoryUri,
        },
  },
});

    const vpc = new ec2.Vpc(this, "HubAccessComServiceVpc", {
      maxAzs: 3 // Default is all AZs in region
    });

    const cluster = new ecs.Cluster(this, "HubAccessComServiceEcsCluster", {
      vpc: vpc
    });



     // ECS Task Execution Role
     const executionRole = new iam.Role(this, 'HubAccessComServiceEcsExecutionRole', {
        assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      });
  
      // Attach the necessary policies for ECS task execution
      executionRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'));
  
      // CloudWatch permissions for ECS task execution role
      executionRole.addToPolicy(new iam.PolicyStatement({
        actions: [
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: ['arn:aws:logs:*:*:*'],
      }));
  
      // ECS Task Role
      const taskRole = new iam.Role(this, 'EcsTaskRole', {
        assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      });
  
      // Attach the necessary policies for ECS task
      taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess')); // Example policy
  
      // CloudWatch permissions for ECS task role
      taskRole.addToPolicy(new iam.PolicyStatement({
        actions: [
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: ['arn:aws:logs:*:*:*'],
      }));
    
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'HubAccessComServiceTaskDefinition', {
      memoryLimitMiB: 512,
      cpu: 256,
      runtimePlatform: {
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
      },
      taskRole: taskRole,
      executionRole: executionRole,
      
    
    });
    
    taskDefinition.addContainer('hubaccesscomservice', {
        logging: ecs.LogDriver.awsLogs({ streamPrefix: 'hub-on-fargate' }),
        portMappings: [{ containerPort: 8080, hostPort: 8080}],
        image: ecs.ContainerImage.fromEcrRepository(ecrRepository),
        healthCheck: {
            command: ['CMD-SHELL', 'curl -f http://localhost:8080/healthStatus || exit 1'],
            interval: cdk.Duration.seconds(30),
            timeout: cdk.Duration.seconds(5),
            retries: 3,
            startPeriod: cdk.Duration.seconds(60),
          }
      });

    const ecsService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "HubAccessComFargateService", {
      serviceName: 'HubAccessComService',
      cluster: cluster, // Required
      cpu: 512, // Default is 256
      desiredCount: 2, // Default is 1
      taskDefinition: taskDefinition,
      //taskImageOptions: {
        //image: ecs.ContainerImage.fromEcrRepository(ecrRepository),
      //},
      memoryLimitMiB: 2048, // Default is 512
      publicLoadBalancer: true, // Default is true,
      platformVersion: ecs.FargatePlatformVersion.LATEST,
    
      
    });

    const targetGroup = ecsService.targetGroup;
    targetGroup.configureHealthCheck({
        path: '/healthStatus',
        port: '8080',
    });

    // Create the CodePipeline
    const pipeline = new codepipeline.Pipeline(this, 'HubAccessComServiceCodePipeline', {
      pipelineName: 'HubAccessComServiceCodePipeline'
    });

    const sourceAction = new codepipeline_actions.EcrSourceAction({
        actionName: 'Push',
        repository: ecrRepository,
        output: sourceOutput,
    });
    pipeline.addStage({
      stageName: 'Source',
      actions: [
        sourceAction
      ],
    });


    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'CodeBuild',
          project: buildProject,
          input: sourceOutput,
          outputs: [buildOutput],
        }),
      ],
    });

    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new codepipeline_actions.EcsDeployAction({
          actionName: 'DeployAction',
          service: ecsService.service,
          input: buildOutput
        }),
      ],
    });
  }
}