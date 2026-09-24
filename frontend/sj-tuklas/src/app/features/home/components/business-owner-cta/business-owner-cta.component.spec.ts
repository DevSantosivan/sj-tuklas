import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusinessOwnerCtaComponent } from './business-owner-cta.component';

describe('BusinessOwnerCtaComponent', () => {
  let component: BusinessOwnerCtaComponent;
  let fixture: ComponentFixture<BusinessOwnerCtaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessOwnerCtaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusinessOwnerCtaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
