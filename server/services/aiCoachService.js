/**
 * AI Coach Service - Wrapper for Shared Handler
 *
 * This module re-exports from the shared handler for backward compatibility.
 * Server routes should use the shared handler directly.
 */

import { getCoachResponse } from '../../api/coachHandler.js';

export { getCoachResponse };
