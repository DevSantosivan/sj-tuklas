import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusinessLayoutComponent } from './business-layout.component';

describe('BusinessLayoutComponent', () => {
  let component: BusinessLayoutComponent;
  let fixture: ComponentFixture<BusinessLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusinessLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
