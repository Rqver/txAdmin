import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {useAdminPerms} from "@/hooks/auth";
import {useBackendApi} from "@/hooks/fetch";
import {PlayerModalRefType} from "@/hooks/playerModal";
import {cn, msToDuration, tsToLocaleDate} from "@/lib/utils";
import {GenericApiOkResp} from "@shared/genericApiTypes";
import {PlayerModalPlayerData} from "@shared/playerApiTypes";
import {useRef, useState} from "react";


function LogActionCounter({type, count, style}: {
    type: 'Ban' | 'Warn' | 'Kick',
    count: number,
    style?: React.CSSProperties
}) {
    const pluralLabel = (count > 1) ? `${type}s` : type;
    let backgroundClass = '';
    let textClass = '';

    switch (type) {
        case 'Ban':
            backgroundClass = 'bg-destructive';
            textClass = 'text-destructive-foreground';
            break;
        case 'Warn':
            backgroundClass = 'bg-success';
            textClass = 'text-success-foreground';
            break;
        case 'Kick':
            backgroundClass = 'bg-warning';
            textClass = 'text-warning-foreground';
            break;
        default:
            break;
    }

    return <span style={style} className={cn(
        'rounded-sm text-xs font-semibold px-1 py-[0.125rem] tracking-widest text-center inline-block',
        backgroundClass,
        textClass
    )}>
        {count} {pluralLabel}
    </span>
}


type PlayerNotesBoxProps = {
    playerRef: PlayerModalRefType;
    player: PlayerModalPlayerData;
    refreshModalData: () => void;
}

const calcTextAreaLines = (text?: string) => {
    if (!text) return 3;
    const lines = text.trim().split('\n').length + 1;
    return Math.min(Math.max(lines, 3), 16);
}

function PlayerNotesBox({playerRef, player, refreshModalData}: PlayerNotesBoxProps) {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [notesLogText, setNotesLogText] = useState(player.notesLog ?? '');
    const [textAreaLines, setTextAreaLines] = useState(calcTextAreaLines(player.notes));
    const playerNotesApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/save_note`,
    });

    const doSaveNotes = () => {
        setNotesLogText('Saving...');
        playerNotesApi({
            queryParams: playerRef,
            data: {
                note: textAreaRef.current?.value.trim(),
            },
            success: (data) => {
                if ('error' in data) {
                    setNotesLogText(data.error);
                } else {
                    refreshModalData();
                }
            },
        });
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey && !window.txIsMobile) {
            event.preventDefault();
            doSaveNotes();
        } else {
            setTextAreaLines(calcTextAreaLines(event.currentTarget.value));
        }
    }

    return <>
        <Label htmlFor="playerNotes">
            Notes: <span className="text-muted-foreground">{notesLogText}</span>
        </Label>
        <Textarea
            ref={textAreaRef}
            id="playerNotes"
            className="w-full mt-1"
            disabled={!player.isRegistered}
            defaultValue={player.notes}
            onChange={() => setNotesLogText('Press enter to save.')}
            onKeyDown={handleKeyDown}
            //1rem of padding + 1.25rem per line
            style={{height: `${1 + 1.25 * textAreaLines}rem`}}
            placeholder={player.isRegistered
                ? 'Type your notes about the player.'
                : 'Cannot set notes for players that are not registered.'}
        />
        {window.txIsMobile && <div className="mt-2 w-full">
            <Button
                variant="outline"
                size='xs'
                onClick={doSaveNotes}
                disabled={!player.isRegistered}
                className="w-full"
            >Save Note</Button>
        </div>}
    </>
}


type InfoTabProps = {
    playerRef: PlayerModalRefType;
    player: PlayerModalPlayerData;
    setSelectedTab: (t: string) => void;
    refreshModalData: () => void;
}

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'nowrap',
    } as React.CSSProperties,
    counter: {
        flex: '1 0 auto',
        minWidth: '50px',
        margin: '0 0.2em',
    } as React.CSSProperties,
};


export default function InfoTab({playerRef, player, setSelectedTab, refreshModalData}: InfoTabProps) {
    const {hasPerm} = useAdminPerms();
    const playerWhitelistApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/whitelist`,
    });

    const sessionTimeText = player.sessionTime ? msToDuration(
        player.sessionTime * 60_000,
        {units: ['h', 'm']}
    ) : '--';
    const lastConnectionText = player.tsLastConnection
        ? tsToLocaleDate(player.tsLastConnection)
        : '--';
    const playTimeText = player.playTime ? msToDuration(
        player.playTime * 60_000,
        {units: ['d', 'h', 'm']}
    ) : '--';
    const joinDateText = player.tsJoined ? tsToLocaleDate(player.tsJoined) : '--';
    const whitelistedText = player.tsWhitelisted ? tsToLocaleDate(player.tsWhitelisted) : 'not yet';
    const banCount = player.actionHistory.filter((a) => a.type === 'ban').length;
    const warnCount = player.actionHistory.filter((a) => a.type === 'warn').length;
    const kickCount = player.actionHistory.filter((a) => a.type === 'kick').length;

    const handleWhitelistClick = () => {
        playerWhitelistApi({
            queryParams: playerRef,
            data: {
                status: !player.tsWhitelisted
            },
            toastLoadingMessage: 'Updating whitelist...',
            genericHandler: {
                successMsg: 'Whitelist changed.',
            },
            success: (data, toastId) => {
                if ('success' in data) {
                    refreshModalData();
                }
            },
        });
    }

    return <div className="p-1">
        <dl className="pb-2">
            {player.isConnected && <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground">Session Time</dt>
                <dd className="text-sm leading-6 col-span-2 mt-0">{sessionTimeText}</dd>
            </div>}
            <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground">Play Time</dt>
                <dd className="text-sm leading-6 col-span-2 mt-0">{playTimeText}</dd>
            </div>
            <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground">Join Date</dt>
                <dd className="text-sm leading-6 col-span-2 mt-0">{joinDateText}</dd>
            </div>
            {!player.isConnected && <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground">Last Connection</dt>
                <dd className="text-sm leading-6 col-span-2 mt-0">{lastConnectionText}</dd>
            </div>}

            <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground">ID Whitelisted</dt>
                <dd className="text-sm leading-6 mt-0">{whitelistedText}</dd>
                <dd className="text-right">
                    <Button
                        variant="outline"
                        size='inline'
                        style={{minWidth: '8.25ch'}}
                        onClick={handleWhitelistClick}
                        disabled={!hasPerm('players.whitelist')}
                    >
                        {player.tsWhitelisted ? 'Remove' : 'Add WL'}
                    </Button>
                </dd>
            </div>
            <div className="py-0.5 grid grid-cols-3 gap-4 px-0">
                <dt className="text-sm font-medium leading-6 text-muted-foreground">Log</dt>
                <dd className="text-sm leading-6 mt-0 space-x-2">
                    <div style={styles.container}>
                        <LogActionCounter type="Ban" count={banCount} style={styles.counter}/>
                        <LogActionCounter type="Kick" count={kickCount} style={styles.counter}/>
                        <LogActionCounter type="Warn" count={warnCount} style={styles.counter}/>
                    </div>
                </dd>
                <dd className="text-right">
                    <Button
                        variant="outline"
                        size='inline'
                        style={{minWidth: '8.25ch'}}
                        onClick={() => {
                            setSelectedTab('History')
                        }}
                    >View</Button>
                </dd>
            </div>
        </dl>

        <PlayerNotesBox player={player} playerRef={playerRef} refreshModalData={refreshModalData}/>
    </div>;
}
