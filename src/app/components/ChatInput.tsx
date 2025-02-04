'use client'

import { MessagesContext } from '@/context/messages'
import { cn } from '@/lib/utils'
import { Message } from '@/lib/validators/message'
import { useMutation } from '@tanstack/react-query'
import { CornerDownLeft, Loader2 } from 'lucide-react'
import { nanoid } from 'nanoid'
import { FC, HTMLAttributes, useContext, useRef, useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { toast } from 'react-hot-toast'

// Interface below allows the ChatInput component to receive all the attributes that a normal div tag gets
interface ChatInputProps extends HTMLAttributes<HTMLDivElement>{
  
}

const ChatInput: FC<ChatInputProps> = ({className, ...props}) => {

    const [input, setInput] = useState<string>('')
    const { messages, addMessage, removeMessage, updateMessage, setIsMessageUpdating } = useContext(MessagesContext)
    // Grants us access to the Textarea DOM node
    const textareaRef = useRef<null | HTMLTextAreaElement>(null); 

    const { mutate: sendMessage, isPending } = useMutation({
        mutationFn: async (message: Message) => {
            const response = await fetch('/api/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({messages: [message]}),
            })

            if(!response.ok){
                throw new Error()
            }

            return response.body
        },
        onMutate(message){
            addMessage(message)
        },
        onSuccess: async (stream) => {
            if(!stream) throw new Error('No Stream Found!')

            const id = nanoid()
            const responseMessage: Message = {
                id,
                isUserMessage: false,
                text: ''
            }

            addMessage(responseMessage)
            setIsMessageUpdating(true)

            const reader = stream.getReader()
            const decoder = new TextDecoder()
            let done = false

            while(!done){
                const {value, done: doneReading} = await reader.read()
                done = doneReading
                const chunkValue = decoder.decode(value)
                updateMessage(id, (prev) => prev + chunkValue)
            }

            // Cleanup
            setIsMessageUpdating(false)
            setInput('')
            setTimeout(() => {
                textareaRef.current?.focus()
            }, 10)
        },
        onError(_, message) {
            toast.error('Something went wrong. Please try again.')
            removeMessage(message.id)
            textareaRef.current?.focus()
        },
    })

    // Code below allows the ChatInput component to receive all the attributes that a normal div tag gets
  return <div {...props} className={cn('border-t border-zinc-300', className)}>
    <div className="relative mt-4 flex-1 overflow-hidden rounded-lg border-none outline-none">
        <TextareaAutosize 
            ref={textareaRef}
            rows={2}
            maxRows={4}
            value={input}
            disabled={isPending}
            onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey){
                    e.preventDefault()

                    const message: Message = {
                        id: nanoid(),
                        isUserMessage: true,
                        text: input
                    }
                    sendMessage(message)
                }
            }}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            placeholder='Got any questions?'
            className='peer disabled:opacity-50 pr-14 resize-none block w-full border-0 bg-zinc-100 py-1.5 text-gray-900 focus:ring-0 text-sm sm:leading-6'   
        />

        <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
            <kbd className="inline-flex items-center rounded border border-gray-200 bg-white px-1 font-sans text-xs text-gray-400">
                {isPending ? <Loader2 className='w-3 h-3 animate-spin'/> : <CornerDownLeft className='w-3 h-3'/>}
            </kbd>
        </div>

        <div aria-hidden='true' className='absolute inset-x-0 bottom-0 border-t border-gray-300 peer-focus:border-t-2 peer-focus:border-[#f97316]'/>
    </div>
  </div>
}

export default ChatInput