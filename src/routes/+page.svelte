<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { Auth } from '@supabase/auth-ui-svelte';

	export let data;
</script>

<svelte:head>
	<title>User Management</title>
</svelte:head>

<div>
	<Auth
		supabaseClient={data.supabase}
		view="magic_link"
		redirectTo={`${data.url}/auth/callback`}
		showLinks={false}
	/>
</div>
