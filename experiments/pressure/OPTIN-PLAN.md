# Pressure Experiment public opt-in candidate — bounded contract

Base: `5040bd41bc589959137d00b3a189d082013d64d5`. Branch: `feature/pressure-optin-20260926`. This is an integration candidate for root review, not publication authority. No Audio, Touch, Petting, canonical topology, stitch timing, or production renderer change.

One persisted `pressureExperimentEnabled` boolean is added to current studio settings, normalized strictly to false when absent or malformed and defaulting OFF. A single experimental toggle appears near Stitch motion. English and Chinese copy says pen pressure changes only the loose thread while positioning the needle, fallback remains normal, and physical device feel is unvalidated. Existing mouse and touch interactions remain on the neutral model.

When the toggle is ON, begin a `PressureGesture` only after the hoop acquires an owned primary pen stitch pointer. Feed owned active pen samples from `pointerdown` and `pointermove` (including optional coalesced samples) into the existing bounded `pressureSlackScale` mapping. Apply the resulting optional slack scale only to `createActiveThread` / `setActiveThreadSlack` for the transient loose-thread preview. Do not persist pressure. An unchanging 0.5 pen stream is neutral and is not evidence of hardware sensitivity. Mouse/touch, nonowners, invalid values and inactive events stay neutral.

The pure gesture/mapping helper lives at `src/pressure-input.ts` so the studio and isolated demo import the same implementation; this is a file move from the prototype module, with no duplicate pressure state machine.

On `pointerup`, capture the last active scale before ending/resetting the gesture; use it for the final transient preview snapshot without treating the specified pressure-zero up event as a light stroke. On cancel/capture loss/blur and on disabling, reset pressure ownership and return the transient thread to neutral immediately. Turning ON during an existing gesture does not retroactively acquire it. Toggling does not call puncture, alter stitch data, or change fixed stitch-motion duration.

Gate: strict settings normalization and legacy load tests; pure pressure ownership/default tests; browser synthetic routing with OFF, ON/variable pen, ON/constant 0.5 pen, mouse/touch, nonowner, cancel, up, disable, and EN/ZH labels. Browser evidence is synthetic only. Build/typecheck and bounded relevant tests must pass. Root owns review and release; physical stylus feel remains `HUMAN_DEVICE_VALIDATION_REQUIRED` without blocking a safe default-OFF candidate.
