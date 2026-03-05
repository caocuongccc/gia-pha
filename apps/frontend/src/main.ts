import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';

// ✅ Fix: import AppComponent từ app.component (không phải './app/app')
// Angular 17+ standalone: file tên là app.component.ts, export class AppComponent
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);
