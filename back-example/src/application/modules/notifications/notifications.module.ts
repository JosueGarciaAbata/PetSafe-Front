import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NOTIFICATION_CHANNELS } from '../../../domain/constants/notification.constants.js';
import { NotificationDispatcherService } from '../../services/notifications/notification-dispatcher.service.js';
import { EmailNotificationChannelService } from '../../services/notifications/channels/email-notification-channel.service.js';
import { AuthNotificationContentFactory } from '../../services/notifications/templates/auth-notification-content.factory.js';

@Module({
  imports: [ConfigModule],
  providers: [
    EmailNotificationChannelService,
    AuthNotificationContentFactory,
    NotificationDispatcherService,
    {
      provide: NOTIFICATION_CHANNELS,
      useFactory: (
        emailChannel: EmailNotificationChannelService,
      ) => [emailChannel],
      inject: [EmailNotificationChannelService],
    },
  ],
  exports: [NotificationDispatcherService, AuthNotificationContentFactory],
})
export class NotificationsModule {}
