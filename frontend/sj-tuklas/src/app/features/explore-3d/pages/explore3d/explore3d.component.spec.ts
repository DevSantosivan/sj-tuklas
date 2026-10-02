import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Explore3dComponent } from './explore3d.component';

describe('Explore3dComponent', () => {
  let component: Explore3dComponent;
  let fixture: ComponentFixture<Explore3dComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Explore3dComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Explore3dComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
