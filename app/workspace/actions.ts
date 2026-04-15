'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAdminActionContext } from '@/lib/admin/auth'

function parseNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? nextValue : null
}

function readString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readRedirectTarget(formData: FormData) {
  return readString(formData.get('redirect_to')) ?? '/workspace'
}

function redirectToTarget(
  target: string,
  message: string,
  type: 'success' | 'error' = 'success'
) {
  const search = new URLSearchParams()
  search.set(type, message)
  return `${target}?${search.toString()}`
}

export async function createFlavor(formData: FormData) {
  const result = await getAdminActionContext()
  const redirectTarget = readRedirectTarget(formData)

  if ('error' in result) {
    redirect(redirectToTarget(redirectTarget, result.error, 'error'))
  }

  const slug = readString(formData.get('slug'))
  const description = readString(formData.get('description'))
  const actorId = result.context.profileId

  if (!slug) {
    redirect(redirectToTarget(redirectTarget, 'Slug is required.', 'error'))
  }

  const { error } = await result.context.supabase.from('humor_flavors').insert({
    slug,
    description,
    created_by_user_id: actorId,
    modified_by_user_id: actorId,
  })

  if (error) {
    redirect(redirectToTarget(redirectTarget, error.message, 'error'))
  }

  revalidatePath('/workspace')
  redirect(redirectToTarget(redirectTarget, 'Humor flavor created.'))
}

export async function updateFlavor(formData: FormData) {
  const result = await getAdminActionContext()
  const redirectTarget = readRedirectTarget(formData)

  if ('error' in result) {
    redirect(redirectToTarget(redirectTarget, result.error, 'error'))
  }

  const id = readString(formData.get('id'))
  const slug = readString(formData.get('slug'))
  const description = readString(formData.get('description'))
  const actorId = result.context.profileId

  if (!id || !slug) {
    redirect(redirectToTarget(redirectTarget, 'Flavor id and slug are required.', 'error'))
  }

  const { error } = await result.context.supabase
    .from('humor_flavors')
    .update({
      slug,
      description,
      modified_by_user_id: actorId,
    })
    .eq('id', id)

  if (error) {
    redirect(redirectToTarget(redirectTarget, error.message, 'error'))
  }

  revalidatePath('/workspace')
  redirect(redirectToTarget(redirectTarget, 'Humor flavor updated.'))
}

export async function deleteFlavor(formData: FormData) {
  const result = await getAdminActionContext()
  const redirectTarget = readRedirectTarget(formData)

  if ('error' in result) {
    redirect(redirectToTarget(redirectTarget, result.error, 'error'))
  }

  const id = readString(formData.get('id'))
  if (!id) {
    redirect(redirectToTarget(redirectTarget, 'Flavor id is required.', 'error'))
  }

  const { error } = await result.context.supabase.from('humor_flavors').delete().eq('id', id)

  if (error) {
    redirect(redirectToTarget(redirectTarget, error.message, 'error'))
  }

  revalidatePath('/workspace')
  redirect(redirectToTarget(redirectTarget, 'Humor flavor deleted.'))
}

export async function createStep(formData: FormData) {
  const result = await getAdminActionContext()
  const redirectTarget = readRedirectTarget(formData)

  if ('error' in result) {
    redirect(redirectToTarget(redirectTarget, result.error, 'error'))
  }

  const humorFlavorId = readString(formData.get('humor_flavor_id'))
  const description = readString(formData.get('description'))
  const explicitOrder = parseNumber(formData.get('order_by'))
  const llmModelId = parseNumber(formData.get('llm_model_id'))
  const llmInputTypeId = parseNumber(formData.get('llm_input_type_id'))
  const llmOutputTypeId = parseNumber(formData.get('llm_output_type_id'))
  const humorFlavorStepTypeId = parseNumber(formData.get('humor_flavor_step_type_id'))
  const llmTemperature = parseNumber(formData.get('llm_temperature'))
  const llmSystemPrompt = readString(formData.get('llm_system_prompt'))
  const llmUserPrompt = readString(formData.get('llm_user_prompt'))
  const actorId = result.context.profileId

  if (
    !humorFlavorId ||
    llmModelId === null ||
    llmInputTypeId === null ||
    llmOutputTypeId === null ||
    humorFlavorStepTypeId === null
  ) {
    redirect(
      redirectToTarget(
        redirectTarget,
        'Flavor, model, input type, output type, and step type are required.',
        'error'
      )
    )
  }

  let orderBy = explicitOrder
  if (orderBy === null) {
    const { data } = await result.context.supabase
      .from('humor_flavor_steps')
      .select('order_by')
      .eq('humor_flavor_id', humorFlavorId)
      .order('order_by', { ascending: false })
      .limit(1)
      .maybeSingle()

    orderBy = typeof data?.order_by === 'number' ? data.order_by + 1 : 1
  }

  const payload: Record<string, string | number | null> = {
    humor_flavor_id: humorFlavorId,
    description,
    order_by: orderBy,
    llm_model_id: llmModelId,
    llm_input_type_id: llmInputTypeId,
    llm_output_type_id: llmOutputTypeId,
    humor_flavor_step_type_id: humorFlavorStepTypeId,
    llm_temperature: llmTemperature,
    llm_system_prompt: llmSystemPrompt,
    llm_user_prompt: llmUserPrompt,
    created_by_user_id: actorId,
    modified_by_user_id: actorId,
  }

  if (description === null) {
    delete payload.description
  }
  if (llmTemperature === null) {
    delete payload.llm_temperature
  }
  if (llmSystemPrompt === null) {
    delete payload.llm_system_prompt
  }
  if (llmUserPrompt === null) {
    delete payload.llm_user_prompt
  }

  const { error } = await result.context.supabase.from('humor_flavor_steps').insert(payload)

  if (error) {
    redirect(redirectToTarget(redirectTarget, error.message, 'error'))
  }

  revalidatePath('/workspace')
  redirect(redirectToTarget(redirectTarget, 'Humor flavor step created.'))
}

export async function updateStep(formData: FormData) {
  const result = await getAdminActionContext()
  const redirectTarget = readRedirectTarget(formData)

  if ('error' in result) {
    redirect(redirectToTarget(redirectTarget, result.error, 'error'))
  }

  const id = readString(formData.get('id'))
  const description = readString(formData.get('description'))
  const orderBy = parseNumber(formData.get('order_by'))
  const llmModelId = parseNumber(formData.get('llm_model_id'))
  const llmInputTypeId = parseNumber(formData.get('llm_input_type_id'))
  const llmOutputTypeId = parseNumber(formData.get('llm_output_type_id'))
  const humorFlavorStepTypeId = parseNumber(formData.get('humor_flavor_step_type_id'))
  const llmTemperature = parseNumber(formData.get('llm_temperature'))
  const llmSystemPrompt = readString(formData.get('llm_system_prompt'))
  const llmUserPrompt = readString(formData.get('llm_user_prompt'))
  const actorId = result.context.profileId

  if (
    !id ||
    orderBy === null ||
    llmModelId === null ||
    llmInputTypeId === null ||
    llmOutputTypeId === null ||
    humorFlavorStepTypeId === null
  ) {
    redirect(
      redirectToTarget(redirectTarget, 'Step id, description, and order are required.', 'error')
    )
  }

  const payload: Record<string, string | number | null> = {
    description,
    order_by: orderBy,
    llm_model_id: llmModelId,
    llm_input_type_id: llmInputTypeId,
    llm_output_type_id: llmOutputTypeId,
    humor_flavor_step_type_id: humorFlavorStepTypeId,
    llm_temperature: llmTemperature,
    llm_system_prompt: llmSystemPrompt,
    llm_user_prompt: llmUserPrompt,
    modified_by_user_id: actorId,
  }

  const { error } = await result.context.supabase
    .from('humor_flavor_steps')
    .update(payload)
    .eq('id', id)

  if (error) {
    redirect(redirectToTarget(redirectTarget, error.message, 'error'))
  }

  revalidatePath('/workspace')
  redirect(redirectToTarget(redirectTarget, 'Humor flavor step updated.'))
}

export async function deleteStep(formData: FormData) {
  const result = await getAdminActionContext()
  const redirectTarget = readRedirectTarget(formData)

  if ('error' in result) {
    redirect(redirectToTarget(redirectTarget, result.error, 'error'))
  }

  const id = readString(formData.get('id'))
  if (!id) {
    redirect(redirectToTarget(redirectTarget, 'Step id is required.', 'error'))
  }

  const { error } = await result.context.supabase
    .from('humor_flavor_steps')
    .delete()
    .eq('id', id)

  if (error) {
    redirect(redirectToTarget(redirectTarget, error.message, 'error'))
  }

  revalidatePath('/workspace')
  redirect(redirectToTarget(redirectTarget, 'Humor flavor step deleted.'))
}

export async function moveStep(formData: FormData) {
  const result = await getAdminActionContext()
  const redirectTarget = readRedirectTarget(formData)

  if ('error' in result) {
    redirect(redirectToTarget(redirectTarget, result.error, 'error'))
  }

  const stepId = readString(formData.get('step_id'))
  const humorFlavorId = readString(formData.get('humor_flavor_id'))
  const direction = readString(formData.get('direction'))
  const actorId = result.context.profileId

  if (!stepId || !humorFlavorId || (direction !== 'up' && direction !== 'down')) {
    redirect(redirectToTarget(redirectTarget, 'Invalid step reorder request.', 'error'))
  }

  const { data, error } = await result.context.supabase
    .from('humor_flavor_steps')
    .select('id, order_by')
    .eq('humor_flavor_id', humorFlavorId)
    .order('order_by', { ascending: true })

  if (error) {
    redirect(redirectToTarget(redirectTarget, error.message, 'error'))
  }

  const steps = (data ?? []).map((row, index) => ({
    id: String(row.id),
    order_by: typeof row.order_by === 'number' ? row.order_by : index + 1,
  }))

  const currentIndex = steps.findIndex((step) => step.id === stepId)
  if (currentIndex === -1) {
    redirect(redirectToTarget(redirectTarget, 'Step not found.', 'error'))
  }

  const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (swapIndex < 0 || swapIndex >= steps.length) {
    redirect(redirectToTarget(redirectTarget, 'Step is already at the edge.', 'error'))
  }

  const currentStep = steps[currentIndex]
  const adjacentStep = steps[swapIndex]

  const updateCurrent = await result.context.supabase
    .from('humor_flavor_steps')
    .update({
      order_by: adjacentStep.order_by,
      modified_by_user_id: actorId,
    })
    .eq('id', currentStep.id)

  if (updateCurrent.error) {
    redirect(redirectToTarget(redirectTarget, updateCurrent.error.message, 'error'))
  }

  const updateAdjacent = await result.context.supabase
    .from('humor_flavor_steps')
    .update({
      order_by: currentStep.order_by,
      modified_by_user_id: actorId,
    })
    .eq('id', adjacentStep.id)

  if (updateAdjacent.error) {
    redirect(redirectToTarget(redirectTarget, updateAdjacent.error.message, 'error'))
  }

  revalidatePath('/workspace')
  redirect(redirectToTarget(redirectTarget, direction === 'up' ? 'Step moved up.' : 'Step moved down.'))
}
