import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import { NotificationChannel } from '../../../../domain/interfaces/notification-channel.interface.js';
import { NotificationMessage } from '../../../../presentation/dto/notifications/notification-message.dto.js';

@Injectable()
export class EmailNotificationChannelService implements NotificationChannel {
  private readonly logger = new Logger(EmailNotificationChannelService.name);
  private transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null =
    null;

  constructor(private readonly configService: ConfigService) {}

  supports(channel: NotificationMessage['channel']): boolean {
    return channel === 'email';
  }

  async send(message: NotificationMessage): Promise<void> {
    if (!message.recipient.email) {
      throw new InternalServerErrorException(
        'El destinatario para email es obligatorio',
      );
    }

    const transporter = this.getTransporter();
    const fromAddress = this.configService.get<string>('SMTP_FROM_EMAIL');
    const fromName = this.configService.get<string>(
      'SMTP_FROM_NAME',
      'SafePet',
    );

    if (!fromAddress) {
      throw new InternalServerErrorException(
        'SMTP_FROM_EMAIL no está configurado',
      );
    }

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: message.recipient.email,
        subject: message.subject ?? 'Notificación SafePet',
        text: message.content.text,
        html: message.content.html,
      });
    } catch (error) {
      this.logger.error('No se pudo enviar el correo', error);
      throw new InternalServerErrorException(
        'No se pudo enviar la notificación por correo',
      );
    }
  }

  private getTransporter(): nodemailer.Transporter<SMTPTransport.SentMessageInfo> {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !port || !user || !pass) {
      throw new InternalServerErrorException(
        'La configuración SMTP está incompleta',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: { user, pass },
    });

    return this.transporter;
  }
}
