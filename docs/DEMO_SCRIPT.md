# Lucknow — running project demonstration

This is a recording of the actual deployed app: navigation, chart-range changes, live city comparison, threshold changes and the simulation slider. It is not a slideshow.

Demo city: Lucknow, Uttar Pradesh, India (26.8467, 80.9462).

The example uses an assumed traffic PM2.5 share of 40% and a traffic emissions cut of 20%, giving a conditional 8% PM2.5 reduction. This is not an 8% AQI reduction or a measured intervention. The app remains multi-city.

## 01-overview

This is Urbanlytics running with live air quality for Lucknow. The dashboard shows model estimates, weather, pollutant concentrations, and historical trends. Notice the timestamps and changing chart ranges.

## 02-forecast

The forecast workspace shows the provider outlook and experimental model comparisons. Here we scroll through rolling historical tests and indicative uncertainty ranges. These evaluate model output rather than independently verified ground station measurements.

## 03-compare

Next, we select Lucknow alongside New Delhi and Mumbai. The table loads actual provider responses with their own timestamps, concentrations, and cache status.

## 04-alerts

Changing the alert threshold updates the warning state immediately. The same workspace tracks data completeness, historical change and stored model snapshots.

## 05-simulation-before

The selected simulation city is Lucknow. Source contributions start at zero.

## 06-simulation-after

Now assume traffic contributes forty percent of particulate pollution. Moving the emission reduction slider to twenty percent changes the result continuously. The conditional P M two point five reduction is eight percent. This is an assumed sensitivity scenario, not a measured policy outcome.

## 07-operations

The pipeline view reports actual collection health. Cams and weather are connected. Station and satellite fire feeds require provider keys. The notebook works without sign in.

