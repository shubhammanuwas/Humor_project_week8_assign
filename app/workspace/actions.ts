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

function redirectQuery(message: string, type: 'success' | 'error' = 'success') {
  const search = new URLSearchParams()
  search.set(type, message)
  return `/workspace?${search.toString()}`
}

export async function createFlavor(formData: FormData) {
  const result = await getAdminActionContext()
  if ('error' in result) {
    redirect(redirectQuery(result.error, 'error'))
  }

  const slug = readString(formData.get('slug'))
  const description = readString(formData.get('description'))
  const actorId = result.context.profileId

  if (!slug) {
    redirect(redirectQuery('Slug is required.', 'error'))
  }

  const { error } = await result.context.supabase
    .from('humor_flavors')
    .insert({
      slug,
      description,
      created_by_user_id: actorId,
      modified_by_user_id: actorId,
    })

  if (error) {
    redirect(redirectQuery(error.message, 'error'))
  }

  revalidatePath('/workspace')
  redirect(redirectQuery('Humor flavor created.'))
}

export async function updateFlavor(formData: FormData) {
  const result = await getAdminActionContext()
  if ('error' in result) {
    redirect(redirectQuery(result.error, 'error'))
  }

  const id = readString(formData.get('id'))
  const slug = readString(formData.get('slug'))
  const description = readString(formData.get('description'))
  const actorId = result.context.profileId

  if (!id || !slug) {
    redirect(redirectQuery('Flavor id and slug are required.', 'error'))
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
    redirect(redirectQuery(error.message, 'error'))
  }

  revalidatePath('/workspace')
  redirect(redirectQuery('Humor flavor updated.'))
}

export async function deleteFlavor(formData: FormData) {
  const result = await getAdminActionContext()
  if ('error' in result) {
    redirect(redirectQuery(result.error, 'error'))
  }

  const id = readString(formData.get('id'))
  if (!id) {
    redirect(redirectQuery('Flavor id is required.', 'error'))
  }

  const { error } = await result.context.supabase.from('humor_flavors').delete().eq('id', id)

  if (error) {
    redirect(redirectQuery(error.message, 'error'))
  }

  revalidatePath('/workspace')
  redirect(redirectQuery('Humor flavor deleted.'))
}

export async function createStep(formData: FormData) {
  const result = await getAdminActionContext()
  if ('error' in result) {
    redirect(redirectQuery(result.error, 'error'))
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
      redirectQuery(
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
    redirect(redirectQuery(error.message, 'error'))
  }

  revalidatePath('/workspace')
  redirect(redirectQuery('Humor flavor step created.'))
}

export async function updateStep(formData: FormData) {
  const result = await getAdminActionContext()
  if ('error' in result) {
    redirect(redirectQuery(result.error, 'error'))
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
    redirect(redirectQuery('Step id, description, and order are required.', 'error'))
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

  payload.description = description
  payload.llm_temperature = llmTemperature
  payload.llm_system_prompt = llmSystemPrompt
  payload.llm_user_prompt = llmUserPrompt

  const { error } = await result.context.supabase
    .from('humor_flavor_steps')
    .update(payload)
    .eq('id', id)

  if (error) {
    redirect(redirectQuery(error.message, 'error'))
  }

  revalidatePath('/workspace')
  redirect(redirectQuery('Humor flavor step updated.'))
}

export async function deleteStep(formData: FormData) {
  const result = await getAdminActionContext()
  if ('error' in result) {
    redirect(redirectQuery(result.error, 'error'))
  }

  const id = readString(formData.get('id'))
  if (!id) {
    redirect(redirectQuery('Step id is required.', 'error'))
  }

  const { error } = await result.context.supabase
    .from('humor_flavor_steps')
    .delete()
    .eq('id', id)

  if (error) {
    redirect(redirectQuery(error.message, 'error'))
  }

  revalidatePath('/workspace')
  redirect(redirectQuery('Humor flavor step deleted.'))
}

export async function moveStep(formData: FormData) {
  const result = await getAdminActionContext()
  if ('error' in result) {
    redirect(redirectQuery(result.error, 'error'))
  }

  const stepId = readString(formData.get('step_id'))
  const humorFlavorId = readString(formData.get('humor_flavor_id'))
  const direction = readString(formData.get('direction'))
  const actorId = result.context.profileId

  if (!stepId || !humorFlavorId || (direction !== 'up' && direction !== 'down')) {
    redirect(redirectQuery('Invalid step reorder request.', 'error'))
  }

  const { data, error } = await result.context.supabase
    .from('humor_flavor_steps')
    .select('id, order_by')
    .eq('humor_flavor_id', humorFlavorId)
    .order('order_by', { ascending: true })

  if (error) {
    redirect(redirectQuery(error.message, 'error'))
  }

  const steps = (data ?? []).map((row, index) => ({
    id: String(row.id),
    order_by: typeof row.order_by === 'number' ? row.order_by : index + 1,
  }))

  const currentIndex = steps.findIndex((step) => step.id === stepId)
  if (currentIndex === -1) {
    redirect(redirectQuery('Step not found.', 'error'))
  }

  const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (swapIndex < 0 || swapIndex >= steps.length) {
    redirect(redirectQuery('Step is already at the edge.', 'error'))
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
    redirect(redirectQuery(updateCurrent.error.message, 'error'))
  }

  const updateAdjacent = await result.context.supabase
    .from('humor_flavor_steps')
    .update({
      order_by: currentStep.order_by,
      modified_by_user_id: actorId,
    })
    .eq('id', adjacentStep.id)

  if (updateAdjacent.error) {
    redirect(redirectQuery(updateAdjacent.error.message, 'error'))
  }

  revalidatePath('/workspace')
  redirect(redirectQuery(direction === 'up' ? 'Step moved up.' : 'Step moved down.'))
}
