import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovalDetailsComponent } from './approval-details.component';

describe('ApprovalDetailsComponent', () => {
  let component: ApprovalDetailsComponent;
  let fixture: ComponentFixture<ApprovalDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprovalDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
