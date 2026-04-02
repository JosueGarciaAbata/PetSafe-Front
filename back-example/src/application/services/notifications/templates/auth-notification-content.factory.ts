import { Injectable } from '@nestjs/common';
import { NotificationMessage } from '../../../../presentation/dto/notifications/notification-message.dto.js';

interface PasswordResetPinTemplateInput {
  email: string;
  fullName: string;
  pin: string;
  expiresInMinutes: number;
}

interface AccountCreatedTemplateInput {
  email: string;
  fullName: string;
  temporaryPassword: string;
  expiresInHours: number;
}

@Injectable()
export class AuthNotificationContentFactory {
  buildPasswordResetPinMessage(
    input: PasswordResetPinTemplateInput,
  ): NotificationMessage {
    const subject = 'Recuperación de contraseña - SafePet';
    const text = [
      `Hola ${input.fullName},`,
      '',
      'Recibimos una solicitud para restablecer tu contraseña en SafePet.',
      `Tu código de verificación es: ${input.pin}`,
      `Este PIN expira en ${input.expiresInMinutes} minutos y solo se puede usar una vez.`,
      'Si no realizaste esta solicitud, puedes ignorar este mensaje.',
    ].join('\n');

    const html = `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <h2 style="margin-bottom: 8px;">SafePet</h2>
        <p>Hola ${input.fullName},</p>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Usa este PIN de verificación:</p>
        <div style="display: inline-block; padding: 12px 18px; font-size: 28px; font-weight: 700; letter-spacing: 6px; background: #f3f4f6; border-radius: 10px;">
          ${input.pin}
        </div>
        <p style="margin-top: 16px;">Este PIN expira en ${input.expiresInMinutes} minutos y solo se puede usar una vez.</p>
        <p>Si no realizaste esta solicitud, puedes ignorar este mensaje.</p>
      </div>
    `;

    return {
      channel: 'email',
      recipient: {
        email: input.email,
        name: input.fullName,
      },
      subject,
      content: {
        text,
        html,
      },
      metadata: {
        notificationType: 'password_reset_pin',
      },
    };
  }

  buildAccountCreatedMessage(
    input: AccountCreatedTemplateInput,
  ): NotificationMessage {
    const subject = 'Tu cuenta de SafePet ha sido creada';
    const text = [
      `Hola ${input.fullName},`,
      '',
      'Se ha creado una cuenta para ti en SafePet.',
      `Usuario: ${input.email}`,
      `Contraseña temporal: ${input.temporaryPassword}`,
      `Esta contraseña vence en ${input.expiresInHours} horas.`,
      'Debes iniciar sesión y cambiarla de inmediato.',
      'Si la contraseña temporal vence, deberás solicitar una recuperación manual de contraseña.',
    ].join('\n');

    const html = `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <h2 style="margin-bottom: 8px;">SafePet</h2>
        <p>Hola ${input.fullName},</p>
        <p>Se ha creado una cuenta para ti en SafePet.</p>
        <p><strong>Usuario:</strong> ${input.email}</p>
        <p><strong>Contraseña temporal:</strong></p>
        <div style="display: inline-block; padding: 12px 18px; font-size: 24px; font-weight: 700; background: #f3f4f6; border-radius: 10px;">
          ${input.temporaryPassword}
        </div>
        <p style="margin-top: 16px;">Esta contraseña vence en ${input.expiresInHours} horas.</p>
        <p>Debes iniciar sesión y cambiarla de inmediato.</p>
        <p>Si la contraseña temporal vence, deberás solicitar una recuperación manual de contraseña.</p>
      </div>
    `;

    return {
      channel: 'email',
      recipient: {
        email: input.email,
        name: input.fullName,
      },
      subject,
      content: {
        text,
        html,
      },
      metadata: {
        notificationType: 'account_created',
      },
    };
  }
}
