<script lang="ts">
	interface Props {
		label: string;
		value: string;
		options?: Array<{ value: string; label: string; badgeColor?: string }>;
		required?: boolean;
		description?: string;
		onChange?: (val: string) => void;
	}

	let {
		label,
		value = $bindable(),
		options = [
			{ value: 'Y', label: 'Yes', badgeColor: 'green' },
			{ value: 'N', label: 'No', badgeColor: 'red' },
			{ value: 'N/A', label: 'N/A', badgeColor: 'gray' }
		],
		required = true,
		description = '',
		onChange
	}: Props = $props();

	function select(optVal: string) {
		value = optVal;
		if (onChange) onChange(optVal);
	}
</script>

<div class="option-field" class:unselected={required && !value}>
	<div class="field-header">
		<span class="field-label">
			{label}
			{#if required}
				<span class="required-star" title="Required">*</span>
			{/if}
		</span>
		{#if description}
			<span class="field-desc">{description}</span>
		{/if}
	</div>

	<div class="options-group" role="radiogroup" aria-label={label}>
		{#each options as opt}
			<button
				type="button"
				class="opt-btn {opt.badgeColor || 'blue'}"
				class:selected={value === opt.value}
				onclick={() => select(opt.value)}
				aria-checked={value === opt.value}
				role="radio"
			>
				{opt.label}
			</button>
		{/each}
	</div>

	{#if required && !value}
		<span class="validation-msg">Selection required to proceed</span>
	{/if}
</div>

<style>
	.option-field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.65rem 0.8rem;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		transition: all 0.2s ease;
	}

	.option-field.unselected {
		border-color: #fca5a5;
		background: #fffafa;
	}

	.field-header {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.field-label {
		font-size: 0.92rem;
		font-weight: 600;
		color: #1e293b;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.required-star {
		color: #dc2626;
		font-weight: bold;
	}

	.field-desc {
		font-size: 0.78rem;
		color: #64748b;
	}

	.options-group {
		display: flex;
		gap: 0.45rem;
		flex-wrap: wrap;
		margin-top: 0.2rem;
	}

	.opt-btn {
		flex: 1;
		min-width: 60px;
		min-height: 42px;
		padding: 0.45rem 0.75rem;
		border: 1.5px solid #cbd5e1;
		border-radius: 6px;
		background: #f8fafc;
		color: #334155;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	.opt-btn:active {
		transform: scale(0.97);
	}

	/* Selected States */
	.opt-btn.green.selected {
		background: #16a34a;
		border-color: #15803d;
		color: #ffffff;
		box-shadow: 0 2px 6px rgba(22, 163, 74, 0.35);
	}

	.opt-btn.red.selected {
		background: #dc2626;
		border-color: #b91c1c;
		color: #ffffff;
		box-shadow: 0 2px 6px rgba(220, 38, 38, 0.35);
	}

	.opt-btn.gray.selected {
		background: #475569;
		border-color: #334155;
		color: #ffffff;
		box-shadow: 0 2px 6px rgba(71, 85, 105, 0.3);
	}

	.opt-btn.blue.selected {
		background: #0284c7;
		border-color: #0369a1;
		color: #ffffff;
		box-shadow: 0 2px 6px rgba(2, 132, 199, 0.35);
	}

	.opt-btn.amber.selected {
		background: #d97706;
		border-color: #b45309;
		color: #ffffff;
		box-shadow: 0 2px 6px rgba(217, 119, 6, 0.35);
	}

	.validation-msg {
		font-size: 0.74rem;
		color: #dc2626;
		font-weight: 500;
	}
</style>
