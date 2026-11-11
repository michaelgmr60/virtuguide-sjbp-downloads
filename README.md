# VirtuGuide SJBPS

Explore St. John the Baptist Parochial School through a virtual campus tour and augmented reality on Android.

## Website and downloads

- [VirtuGuide SJBPS website](https://michaelgmr60.github.io/virtuguide-sjbps-downloads/)
- [VirtuGuide SJBPS releases and Android downloads](https://github.com/michaelgmr60/virtuguide-sjbps-downloads/releases)

The current APK supports Android 8 or later on 32-bit and 64-bit ARM devices. Camera AR requires an ARCore-compatible phone. Check each release for its requirements.

This is a student thesis alpha. Physical phone testing remains pending for tracking and sustained performance.

## AR picture markers

The original Elementary, Preschool and Senior High School images are in `assets/markers/`. Download all three from [the marker ZIP](assets/virtuguide-ar-markers.zip). Print at 17 × 17 cm, keep the complete picture intact, and scan it in the app's AR mode.

## Static website

The repository root serves the SJBPS companion website through GitHub Pages. Phone layouts account for screen cutouts and gesture bars. No build or backend is required to serve the published files. The Unity project source is stored separately and is not included here.

## Download counter

The website reads GitHub's recorded APK download totals across public releases, with five-minute caching and manual refresh. These are downloads, not unique visitors. Website clicks do not increment the total. No token or visitor tracking is used.
