import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Explore3dEntryModalComponent } from './explore3d-entry-modal.component';

describe('Explore3dEntryModalComponent', () => {
  let component: Explore3dEntryModalComponent;
  let fixture: ComponentFixture<Explore3dEntryModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Explore3dEntryModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Explore3dEntryModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
