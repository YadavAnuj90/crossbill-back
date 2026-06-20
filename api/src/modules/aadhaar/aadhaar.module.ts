import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AadhaarVerification, AadhaarVerificationSchema } from './schemas/aadhaar-verification.schema';
import { AadhaarService } from './aadhaar.service';
import { AadhaarController } from './aadhaar.controller';
import { AADHAAR_PROVIDER } from './providers/aadhaar-provider.interface';
import { SandboxAadhaarProvider } from './providers/sandbox-aadhaar.provider';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AadhaarVerification.name, schema: AadhaarVerificationSchema }]),
    AuditModule,
  ],
  providers: [
    AadhaarService,
    SandboxAadhaarProvider,
    {
      // Select a licensed ASA/KUA provider when configured; otherwise the sandbox.
      provide: AADHAAR_PROVIDER,
      inject: [ConfigService, SandboxAadhaarProvider],
      useFactory: (_config: ConfigService, sandbox: SandboxAadhaarProvider) => {
        // const provider = _config.get('aadhaar.provider');
        // if (provider === 'digio') return new DigioAadhaarProvider(_config);
        return sandbox;
      },
    },
  ],
  controllers: [AadhaarController],
  exports: [AadhaarService],
})
export class AadhaarModule {}
