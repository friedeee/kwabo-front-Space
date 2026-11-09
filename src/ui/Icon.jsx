import {
    AdjustmentsHorizontalIcon, ArrowDownTrayIcon, ArrowLeftIcon, ArrowRightIcon, ArrowRightOnRectangleIcon, BanknotesIcon, Bars3Icon, BellIcon,
    BoltIcon, BriefcaseIcon, BuildingOffice2Icon, CalendarDaysIcon, ChartBarIcon, ChatBubbleLeftRightIcon, CheckCircleIcon, CheckIcon,
    ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardDocumentIcon, ClipboardDocumentListIcon, ClockIcon, CreditCardIcon,
    DocumentCheckIcon, DocumentTextIcon, EnvelopeIcon, ExclamationTriangleIcon, EyeIcon, EyeSlashIcon, FolderIcon, GiftIcon, GlobeAltIcon,
    HandRaisedIcon, HeartIcon, HomeIcon, HomeModernIcon, IdentificationIcon, InformationCircleIcon, LockClosedIcon, MagnifyingGlassIcon,
    MapPinIcon, PaperAirplaneIcon, PaperClipIcon, PhoneIcon, PhotoIcon, PlayIcon, PlusCircleIcon, PlusIcon, PrinterIcon, ReceiptPercentIcon,
    ShieldCheckIcon, SparklesIcon, Squares2X2Icon, StarIcon, TruckIcon, UserGroupIcon, UserIcon, UserPlusIcon, UsersIcon, VideoCameraIcon,
    XCircleIcon, XMarkIcon,
} from '@heroicons/react/24/outline';

/* Heroicons (outline), comme le demande le cahier des charges. */
const ICONS = {
    'adjustments-horizontal': AdjustmentsHorizontalIcon, 'arrow-down-tray': ArrowDownTrayIcon, 'arrow-left': ArrowLeftIcon, 'arrow-right': ArrowRightIcon,
    'arrow-right-on-rectangle': ArrowRightOnRectangleIcon, banknotes: BanknotesIcon, 'bars-3': Bars3Icon, bell: BellIcon, bolt: BoltIcon, briefcase: BriefcaseIcon,
    'building-office-2': BuildingOffice2Icon, 'calendar-days': CalendarDaysIcon, 'chart-bar': ChartBarIcon, 'chat-bubble-left-right': ChatBubbleLeftRightIcon,
    'check-circle': CheckCircleIcon, check: CheckIcon, 'chevron-down': ChevronDownIcon, 'chevron-left': ChevronLeftIcon, 'chevron-right': ChevronRightIcon,
    'clipboard-document': ClipboardDocumentIcon, 'clipboard-document-list': ClipboardDocumentListIcon, clock: ClockIcon, 'credit-card': CreditCardIcon,
    'document-check': DocumentCheckIcon, 'document-text': DocumentTextIcon, envelope: EnvelopeIcon, 'exclamation-triangle': ExclamationTriangleIcon, eye: EyeIcon,
    'eye-slash': EyeSlashIcon, folder: FolderIcon, gift: GiftIcon, 'globe-alt': GlobeAltIcon, 'hand-raised': HandRaisedIcon, heart: HeartIcon, home: HomeIcon,
    'home-modern': HomeModernIcon, identification: IdentificationIcon, 'information-circle': InformationCircleIcon, 'lock-closed': LockClosedIcon,
    'magnifying-glass': MagnifyingGlassIcon, 'map-pin': MapPinIcon, 'paper-airplane': PaperAirplaneIcon, 'paper-clip': PaperClipIcon, phone: PhoneIcon,
    photo: PhotoIcon, play: PlayIcon, 'plus-circle': PlusCircleIcon, plus: PlusIcon, printer: PrinterIcon, 'receipt-percent': ReceiptPercentIcon,
    'shield-check': ShieldCheckIcon, sparkles: SparklesIcon, 'squares-2x2': Squares2X2Icon, star: StarIcon, truck: TruckIcon, 'user-group': UserGroupIcon,
    user: UserIcon, 'user-plus': UserPlusIcon, users: UsersIcon, 'video-camera': VideoCameraIcon, 'x-circle': XCircleIcon, 'x-mark': XMarkIcon,
};

export function Icon({ name, size = 20, className = '' }) {
    const Component = ICONS[name];
    if (!Component) throw new Error(`Icône inconnue : ${name}`);
    return <Component className={`icon ${className}`} width={size} height={size} aria-hidden="true" />;
}

export function WhatsAppIcon({ size = 22 }) {
    return (
        <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.5 14.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.1-.7.2-.2.3-.8 1-.9 1.2-.2.2-.4.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.5.1-.6l.5-.5.3-.5v-.5c-.1-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8a9.9 9.9 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4a9.9 9.9 0 1 1 8.3 4.6zM20.5 3.5A11.8 11.8 0 0 0 .2 11.9c0 2.1.5 4.1 1.6 5.9L.1 24l6.3-1.7a11.9 11.9 0 0 0 5.7 1.4c6.5 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.5-8.3z" />
        </svg>
    );
}
