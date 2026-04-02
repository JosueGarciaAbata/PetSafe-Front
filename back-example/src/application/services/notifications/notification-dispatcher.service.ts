import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { NOTIFICATION_CHANNELS } from '../../../domain/constants/notification.constants.js';
import { NotificationChannel } from '../../../domain/interfaces/notification-channel.interface.js';
import { NotificationMessage } from '../../../presentation/dto/notifications/notification-message.dto.js';

@Injectable()
export class NotificationDispatcherService {
  constructor(
    @Inject(NOTIFICATION_CHANNELS)
    private readonly channels: NotificationChannel[],
  ) {}

  async send(message: NotificationMessage): Promise<void> {
    const channel = this.channels.find((item) => item.supports(message.channel));

    if (!channel) {
      throw new InternalServerErrorException(
        `No existe un proveedor configurado para el canal ${message.channel}`,
      );
    }

    await channel.send(message);
  }
}
