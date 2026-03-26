import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestUiComponent } from './test-ui';

describe('TestUi', () => {
  let component: TestUiComponent;
  let fixture: ComponentFixture<TestUiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestUiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestUiComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
