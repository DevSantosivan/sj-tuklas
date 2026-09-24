import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopularBusinessesComponent } from './popular-businesses.component';

describe('PopularBusinessesComponent', () => {
  let component: PopularBusinessesComponent;
  let fixture: ComponentFixture<PopularBusinessesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopularBusinessesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopularBusinessesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
