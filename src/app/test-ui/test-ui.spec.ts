import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestUi } from './test-ui';

describe('TestUi', () => {
  let component: TestUi;
  let fixture: ComponentFixture<TestUi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestUi]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestUi);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
