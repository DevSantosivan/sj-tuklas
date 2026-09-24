import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExploreLocationsComponent } from './explore-locations.component';

describe('ExploreLocationsComponent', () => {
  let component: ExploreLocationsComponent;
  let fixture: ComponentFixture<ExploreLocationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExploreLocationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExploreLocationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
