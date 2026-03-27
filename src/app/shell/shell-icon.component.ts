import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type ShellIconName =
  | 'dashboard'
  | 'users'
  | 'dog'
  | 'calendar'
  | 'menu'
  | 'clock'
  | 'clipboard'
  | 'syringe'
  | 'heart'
  | 'barChart'
  | 'settings'
  | 'logout'
  | 'search'
  | 'bell'
  | 'user'
  | 'chevronDown';

@Component({
  selector: 'app-shell-icon',
  standalone: true,
  imports: [NgClass],
  templateUrl: './shell-icon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellIconComponent {
  @Input({ required: true }) name!: ShellIconName;
  @Input() size = 20;
  @Input() className = '';
}
