# Security Checklist

## Incident: Exposed Service Role Token

**Date:** 2026-08-11  
**Severity:** Critical  
**Status:** Resolved (token removed from repository)

### What Happened
The `.env.example` file contained a JWT with `role: service_role`, granting full database access. This token was committed to git history.

### Impact Assessment
- Token exposed in git history (all commits)
- Token could be decoded to reveal Supabase project ID
- Service role grants elevated database permissions

### Required Actions

#### 1. Supabase Dashboard - IMMEDIATE
- [ ] Go to: https://app.supabase.com/project/_/settings/api
- [ ] Navigate to "Project API keys"
- [ ] Revoke the compromised service_role key
- [ ] Generate new service_role key (for server-side use ONLY)
- [ ] Copy new ANON key for frontend

#### 2. Repository Cleanup
- [ ] Update `.env.example` with placeholder values (DONE)
- [ ] Consider using `git filter-repo` to remove compromised commit from history
- [ ] Force push to update remote history
- [ ] Notify team to re-clone repository

#### 3. Verify No Further Exposure
Run these checks:
```bash
# Check for any remaining tokens
rg "eyJhbGci" .

# Check for service_role references
rg "service_role" .

# Check git history for tokens
git log --all -p -S "service_role"
```

### Prevention Checklist

#### Environment Variables
- [ ] `.env` and `.env.local` are in `.gitignore`
- [ ] `.env.example` contains only placeholders
- [ ] No actual secrets in committed files

#### CI/CD
- [ ] Secret scanning enabled in GitHub Settings
- [ ] Pre-commit hooks to detect secrets (optional: gitleaks)

#### Supabase
- [ ] RLS enabled on all user tables
- [ ] Frontend uses ANON key only (never service_role)
- [ ] Service role key used only server-side

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/supabaseClient.js` | Uses VITE_SUPABASE_ANON_KEY (SAFE) |
| `supabase/schema.sql` | RLS policies protect data |
| `scripts/seedChessKB.js` | Uses service role for seeding (server-side only) |

### References
- [Supabase API Keys](https://supabase.com/docs/guides/api#api-keys)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
