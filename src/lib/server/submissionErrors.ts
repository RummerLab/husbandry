/** A known identity conflict requires review; an uncertain provider commit stays retryable. */
export class SubmissionConflictError extends Error {
	constructor() {
		super('Submission ID already used for different data');
		this.name = 'SubmissionConflictError';
	}
}
