/**
 * FILE: components/features/ROICalculator.tsx
 * ROLE: Public — interactive section on the Features page (/features).
 *
 * PURPOSE:
 * Lets a visitor estimate how many hours and how much money they'd
 * save per week by switching from manual booking management (phone,
 * email, spreadsheet) to the template's automated booking engine.
 * Assumes the template removes 80% of the manual admin time — a
 * placeholder ratio pending real customer data from the superAdmin
 * dashboard (portfolio results could inform a more precise number
 * once enough case studies exist).
 */
"use client";

import { useState } from "react";
import { Clock, Coins } from "lucide-react";

const AUTOMATION_RATIO = 0.8;

export default function ROICalculator() {
  // Hours per week the resort currently spends on manual booking admin
  const [manualHours, setManualHours] = useState(10);
  // What that time is worth per hour, so savings can be shown in money too
  const [hourlyRate, setHourlyRate] = useState(300);

  const hoursSavedPerWeek = Math.round(manualHours * AUTOMATION_RATIO * 10) / 10;
  const hoursSavedPerMonth = Math.round(hoursSavedPerWeek * 4.33);
  const moneySavedPerMonth = Math.round(hoursSavedPerMonth * hourlyRate);

  return (
    <section className="roiSection">
      <div className="roiSectionInner">
        <div className="roiCopy">
          <p className="eyebrow">ROI Calculator</p>
          <h2 className="sectionTitle">See what manual booking admin is really costing you</h2>
          <p className="sectionSubtitle">
            Move the sliders to match your resort. The estimate assumes the booking engine
            removes about 80% of the time spent taking bookings by phone, email, or spreadsheet.
          </p>
        </div>

        <div className="roiCard">
          <div className="roiInputGroup">
            <label htmlFor="manualHours" className="roiLabel">
              Hours/week on manual booking admin
              <span className="roiLabelValue">{manualHours}h</span>
            </label>
            <input
              id="manualHours"
              type="range"
              min={1}
              max={40}
              step={1}
              value={manualHours}
              onChange={(event) => setManualHours(Number(event.target.value))}
              className="roiSlider"
            />
          </div>

          <div className="roiInputGroup">
            <label htmlFor="hourlyRate" className="roiLabel">
              Value of that time (₱/hour)
              <span className="roiLabelValue">₱{hourlyRate}</span>
            </label>
            <input
              id="hourlyRate"
              type="range"
              min={100}
              max={1000}
              step={25}
              value={hourlyRate}
              onChange={(event) => setHourlyRate(Number(event.target.value))}
              className="roiSlider"
            />
          </div>

          <div className="roiResults">
            <div className="roiResultCard">
              <Clock size={20} strokeWidth={2} className="roiResultIcon" aria-hidden="true" />
              <span className="roiResultValue">{hoursSavedPerWeek}h</span>
              <span className="roiResultLabel">saved per week</span>
            </div>
            <div className="roiResultCard">
              <Coins size={20} strokeWidth={2} className="roiResultIcon" aria-hidden="true" />
              <span className="roiResultValue">₱{moneySavedPerMonth.toLocaleString()}</span>
              <span className="roiResultLabel">saved per month</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
