<script lang="ts">
	import type { Room6AmmoniaData } from '../types';

	let { data = $bindable() }: { data: Room6AmmoniaData } = $props();

	/** Fill the time field with the current Brisbane time (HH:MM). */
	function now() {
		data.time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Australia/Brisbane', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
	}
</script>

<div class="form-container">
	<div class="section-card">
		<h3>Room 6 Ammonia + Nitrite</h3>
		<p class="hint">Save one check each time you test (e.g. 07:00, 12:00 and 18:00). Numbers only, in ppm; 0 is a valid reading.</p>
		<div class="grid">
			<div class="input-field">
				<label for="r6a-initials">Initials <span class="required-star">*</span></label>
				<input id="r6a-initials" type="text" placeholder="e.g. TV" data-field="initials" bind:value={data.initials} required />
			</div>
			<div class="input-field">
				<label for="r6a-time">Time tested <span class="required-star">*</span></label>
				<div class="time-row">
					<input id="r6a-time" type="time" data-field="time" bind:value={data.time} required />
					<button type="button" class="now-btn" onclick={now}>Now</button>
				</div>
			</div>
			<div class="input-field">
				<label for="r6a-ammonia">Ammonia (ppm) <span class="required-star">*</span></label>
				<input id="r6a-ammonia" type="text" inputmode="decimal" placeholder="0" data-field="ammonia" bind:value={data.ammonia} required />
			</div>
			<div class="input-field">
				<label for="r6a-nitrite">Nitrite (ppm) <span class="required-star">*</span></label>
				<input id="r6a-nitrite" type="text" inputmode="decimal" placeholder="0" data-field="nitrite" bind:value={data.nitrite} required />
			</div>
		</div>
		<div class="input-field">
			<label for="r6a-notes">Notes</label>
			<textarea id="r6a-notes" rows="2" placeholder="e.g. Retested after 2 h" data-field="notes" bind:value={data.notes}></textarea>
		</div>
	</div>
</div>

<style>
	.form-container { display: flex; flex-direction: column; gap: 1rem; }
	.section-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; }
	h3 { margin: 0; font-size: 1.1rem; color: #0f172a; }
	.hint { margin: 0; font-size: 0.82rem; color: #475569; }
	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 10rem), 1fr)); gap: 0.75rem; }
	.time-row { display: flex; gap: 0.5rem; }
	.now-btn { min-height: 48px; padding: 0 0.9rem; border: 1.5px solid #cbd5e1; border-radius: 6px; background: #fff; font: inherit; font-size: 0.85rem; cursor: pointer; }
	.input-field { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
	.input-field label { font-size: 0.85rem; font-weight: 600; color: #334155; }
	.input-field input, .input-field textarea { box-sizing: border-box; width: 100%; min-width: 0; min-height: 48px; padding: 0.5rem 0.65rem; border: 1.5px solid #cbd5e1; border-radius: 6px; font: inherit; font-size: 0.9rem; }
	.required-star { color: #dc2626; }
</style>
