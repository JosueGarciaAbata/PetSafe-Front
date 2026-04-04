import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AppToastService } from '@app/core/ui/app-toast.service';

@Component({
  selector: 'app-root',
  imports: [NgClass, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly toast = inject(AppToastService);
}
