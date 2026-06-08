import { Directive, ElementRef, inject, AfterViewChecked, Input } from '@angular/core';

@Directive({
  selector: '[appScrollToBottom]',
  standalone: true,
})
export class ScrollToBottomDirective implements AfterViewChecked {
  private el = inject(ElementRef);
  @Input('appScrollToBottom') shouldScroll = true;

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
    }
  }

  public scrollToBottom(): void {
    const element = this.el.nativeElement;
    element.scrollTop = element.scrollHeight;
  }
}
