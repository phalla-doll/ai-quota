use tauri::image::Image;

/// The tray icon is drawn at runtime rather than shipped as N static assets,
/// because it encodes a live number: a ring that fills clockwise with the
/// highest per-key usage, tinted green → amber → red.
///
/// Windows tray icons are images, not text — there is no badge API to write
/// "68%" into. The exact number lives in the tooltip; the ring is the glance.
const SIZE: u32 = 64;
const OUTER: f32 = 29.0;
const INNER: f32 = 19.0;

const GREEN: [u8; 3] = [34, 197, 94];
const AMBER: [u8; 3] = [245, 158, 11];
const RED: [u8; 3] = [239, 68, 68];
const IDLE: [u8; 3] = [148, 163, 184];
/// The unfilled remainder. Mid-gray reads on both light and dark taskbars.
const TRACK: [u8; 3] = [128, 128, 134];
const TRACK_ALPHA: f32 = 0.35;

fn tint(pct: f64) -> [u8; 3] {
    if pct >= 90.0 {
        RED
    } else if pct >= 75.0 {
        AMBER
    } else {
        GREEN
    }
}

/// `pct` is percent USED; None means nothing readable yet (unpaired, loading,
/// or every key unsupported) and draws a flat idle ring.
pub fn render(pct: Option<f64>) -> Image<'static> {
    let filled = pct.unwrap_or(0.0).clamp(0.0, 100.0) as f32 / 100.0;
    let color = pct.map(tint).unwrap_or(IDLE);

    let center = SIZE as f32 / 2.0;
    let mut rgba = vec![0u8; (SIZE * SIZE * 4) as usize];

    for y in 0..SIZE {
        for x in 0..SIZE {
            // 2x2 supersampling — a hard-edged ring at 16px looks like a
            // staircase once Windows scales it down.
            let mut acc = [0f32; 4];
            for (sx, sy) in [(0.25, 0.25), (0.75, 0.25), (0.25, 0.75), (0.75, 0.75)] {
                let px = x as f32 + sx - center;
                let py = y as f32 + sy - center;
                let dist = (px * px + py * py).sqrt();
                if dist > OUTER || dist < INNER {
                    continue;
                }

                // Angle from 12 o'clock, clockwise, as a 0..1 fraction.
                let frac = {
                    let a = px.atan2(-py);
                    let a = if a < 0.0 {
                        a + std::f32::consts::TAU
                    } else {
                        a
                    };
                    a / std::f32::consts::TAU
                };

                let (c, a) = if pct.is_none() || frac < filled {
                    (color, 1.0)
                } else {
                    (TRACK, TRACK_ALPHA)
                };
                acc[0] += c[0] as f32 * a;
                acc[1] += c[1] as f32 * a;
                acc[2] += c[2] as f32 * a;
                acc[3] += a;
            }

            if acc[3] > 0.0 {
                let i = ((y * SIZE + x) * 4) as usize;
                // Un-premultiply the color, then average alpha over the 4 samples.
                rgba[i] = (acc[0] / acc[3]) as u8;
                rgba[i + 1] = (acc[1] / acc[3]) as u8;
                rgba[i + 2] = (acc[2] / acc[3]) as u8;
                rgba[i + 3] = (acc[3] / 4.0 * 255.0) as u8;
            }
        }
    }

    Image::new_owned(rgba, SIZE, SIZE)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Sample the middle of the ring at `frac` turns clockwise from 12 o'clock.
    fn sample(img: &Image<'_>, frac: f32) -> [u8; 4] {
        let theta = frac * std::f32::consts::TAU;
        let r = (OUTER + INNER) / 2.0;
        let c = SIZE as f32 / 2.0;
        let x = (c + r * theta.sin()) as u32;
        let y = (c - r * theta.cos()) as u32;
        let i = ((y * SIZE + x) * 4) as usize;
        let px = img.rgba();
        [px[i], px[i + 1], px[i + 2], px[i + 3]]
    }

    #[test]
    fn fills_clockwise_from_twelve() {
        let img = render(Some(50.0));
        // First half of the turn is used, second half is the track.
        for frac in [0.1, 0.4] {
            assert_eq!(sample(&img, frac)[..3], GREEN, "{frac} should be filled");
        }
        for frac in [0.6, 0.9] {
            assert_eq!(sample(&img, frac)[..3], TRACK, "{frac} should be track");
        }
    }

    #[test]
    fn tints_by_severity() {
        assert_eq!(sample(&render(Some(100.0)), 0.5)[..3], RED);
        assert_eq!(sample(&render(Some(80.0)), 0.1)[..3], AMBER);
        assert_eq!(sample(&render(None), 0.5)[..3], IDLE);
    }

    #[test]
    fn center_and_outside_stay_transparent() {
        let img = render(Some(100.0));
        let px = img.rgba();
        let center = ((SIZE / 2 * SIZE + SIZE / 2) * 4) as usize;
        assert_eq!(px[center + 3], 0, "hole should be transparent");
        assert_eq!(px[3], 0, "corner should be transparent");
    }
}
