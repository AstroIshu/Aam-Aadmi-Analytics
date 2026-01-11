import classNames from 'classnames';
import {connect} from 'react-redux';
import {compose} from 'redux';
import {
    defineMessages,
    FormattedMessage,
    injectIntl,
    intlShape
} from 'react-intl';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import bowser from 'bowser';
import React from 'react';
import VM from 'scratch-vm';

import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import {ComingSoonTooltip} from '../coming-soon/coming-soon.jsx';
import Divider from '../divider/divider.jsx';
import SaveStatus from './save-status.jsx';
import ProjectWatcher from '../../containers/project-watcher.jsx';
import ShareButton from './share-button.jsx';
import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuItem, MenuSection} from '../menu/menu.jsx';
import ProjectTitleInput from './project-title-input.jsx';
import AuthorInfo from './author-info.jsx';
import AccountNav from '../../containers/account-nav.jsx';
import LoginDropdown from './login-dropdown.jsx';
import SB3Downloader from '../../containers/sb3-downloader.jsx';
import DeletionRestorer from '../../containers/deletion-restorer.jsx';
import TurboMode from '../../containers/turbo-mode.jsx';
import MenuBarHOC from '../../containers/menu-bar-hoc.jsx';
import SettingsMenu from './settings-menu.jsx';

import {openTipsLibrary, openDebugModal} from '../../reducers/modals';
import {setPlayer} from '../../reducers/mode';
import {
    isTimeTravel220022BC,
    isTimeTravel1920,
    isTimeTravel1990,
    isTimeTravel2020,
    isTimeTravelNow,
    setTimeTravel
} from '../../reducers/time-travel';
import {
    autoUpdateProject,
    getIsUpdating,
    getIsShowingProject,
    manualUpdateProject,
    requestNewProject,
    remixProject,
    saveProjectAsCopy
} from '../../reducers/project-state';
import {
    openAboutMenu,
    closeAboutMenu,
    aboutMenuOpen,
    openAccountMenu,
    closeAccountMenu,
    accountMenuOpen,
    openFileMenu,
    closeFileMenu,
    fileMenuOpen,
    openLoginMenu,
    closeLoginMenu,
    loginMenuOpen,
    openModeMenu,
    closeModeMenu,
    modeMenuOpen,
    settingsMenuOpen,
    openSettingsMenu,
    closeSettingsMenu
} from '../../reducers/menus';
import collectMetadata from '../../lib/collect-metadata';

import styles from './menu-bar.css';
import helpIcon from '../../lib/assets/icon--tutorials.svg';
import profileIcon from './icon--profile.png';
import remixIcon from './icon--remix.svg';
import dropdownCaret from './dropdown-caret.svg';
import aboutIcon from './icon--about.svg';
import fileIcon from './icon--file.svg';
import debugIcon from '../debug-modal/icons/icon--debug.svg';
import scratchLogo from './scratch-logo.svg';

import sharedMessages from '../../lib/shared-messages';

const ariaMessages = defineMessages({
    tutorials: {
        id: 'gui.menuBar.tutorialsLibrary',
        defaultMessage: 'Tutorials',
        description: 'accessibility text for the tutorials button'
    },
    debug: {
        id: 'gui.menuBar.debug',
        defaultMessage: 'Debug',
        description: 'accessibility text for the debug button'
    }
});

const MenuBarItemTooltip = ({
    children,
    className,
    enable,
    id,
    place = 'bottom'
}) => {
    if (!enable) {
        return <React.Fragment>{children}</React.Fragment>;
    }
    return (
        <ComingSoonTooltip
            className={classNames(styles.comingSoon, className)}
            place={place}
            tooltipClassName={styles.comingSoonTooltip}
            tooltipId={id}
        >
            {children}
        </ComingSoonTooltip>
    );
};

MenuBarItemTooltip.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    enable: PropTypes.bool,
    id: PropTypes.string,
    place: PropTypes.oneOf(['top', 'bottom', 'left', 'right'])
};

const MenuItemTooltip = ({
    id,
    isRtl,
    children,
    className
}) => (
    <ComingSoonTooltip
        className={classNames(styles.comingSoon, className)}
        isRtl={isRtl}
        place={isRtl ? 'left' : 'right'}
        tooltipClassName={styles.comingSoonTooltip}
        tooltipId={id}
    >
        {children}
    </ComingSoonTooltip>
);

MenuItemTooltip.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    id: PropTypes.string,
    isRtl: PropTypes.bool
};

const AboutButton = props => (
    <Button
        className={classNames(
            styles.menuBarItem,
            styles.hoverable
        )}
        iconClassName={styles.aboutIcon}
        iconSrc={aboutIcon}
        onClick={props.onClick}
    />
);

AboutButton.propTypes = {
    onClick: PropTypes.func.isRequired
};

class MenuBar extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClickNew',
            'handleClickRemix',
            'handleClickSave',
            'handleClickSaveAsCopy',
            'handleClickSeeCommunity',
            'handleClickShare',
            'handleSetMode',
            'handleKeyPress',
            'handleRestoreOption',
            'getSaveToComputerHandler',
            'restoreOptionMessage'
        ]);
    }
    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyPress);
    }
    componentWillUnmount () {
        document.removeEventListener('keydown', this.handleKeyPress);
    }
    handleClickNew (needSave) {
        const readyToReplaceProject = this.props.confirmReadyToReplaceProject(
            this.props.intl.formatMessage(sharedMessages.replaceProjectWarning)
        );
        if (readyToReplaceProject) {
            this.props.onClickNew(needSave);
            this.props.onRequestCloseFile();
        }
    }
    handleClickRemix () {
        this.props.onClickRemix();
        this.props.onRequestCloseFile();
    }
    handleClickSave () {
        this.props.onClickSave();
        this.props.onRequestCloseFile();
    }
    handleClickSaveAsCopy () {
        this.props.onClickSaveAsCopy();
        this.props.onRequestCloseFile();
    }
    handleClickSeeCommunity (waitForUpdate) {
        if (this.props.shouldSaveBeforeTransition()) {
            this.props.autoUpdateProject();
            waitForUpdate(true);
        } else {
            waitForUpdate(false);
        }
    }
    handleClickShare (waitForUpdate) {
        if (!this.props.isShared) {
            if (this.props.canShare) {
                this.props.onShare();
                if (this.props.canSave) {
                    this.props.autoUpdateProject();
                }
                waitForUpdate(true);
            } else {
                waitForUpdate(false);
            }
        } else {
            waitForUpdate(false);
        }
    }
    handleSetMode (mode) {
        if (mode === '1920') {
            document.documentElement.style.filter = 'brightness(.9)contrast(.8)sepia(1.0)';
            document.documentElement.style.height = '100%';
        } else if (mode === '1990') {
            document.documentElement.style.filter = 'hue-rotate(40deg)';
            document.documentElement.style.height = '100%';
        } else {
            document.documentElement.style.filter = '';
            document.documentElement.style.height = '';
        }

        // logo handling no-op now that logo image is removed
        this.props.onSetTimeTravelMode(mode);
    }
    handleRestoreOption (restoreFun) {
        return () => {
            restoreFun();
        };
    }
    handleKeyPress (event) {
        const modifier = bowser.mac ? event.metaKey : event.ctrlKey;
        if (modifier && event.key === 's') {
            this.props.onClickSave();
            event.preventDefault();
        }
    }
    getSaveToComputerHandler (downloadProjectCallback) {
        return () => {
            this.props.onRequestCloseFile(downloadProjectCallback);
        };
    }
    restoreOptionMessage (deletedItem) {
        switch (deletedItem) {
        case 'Sprite':
            return (
                <FormattedMessage
                    defaultMessage="Restore Sprite"
                    description="Menu bar item for restoring the last deleted sprite."
                    id="gui.menuBar.restoreSprite"
                />
            );
        case 'Sound':
            return (
                <FormattedMessage
                    defaultMessage="Restore Sound"
                    description="Menu bar item for restoring the last deleted sound."
                    id="gui.menuBar.restoreSound"
                />
            );
        case 'Costume':
            return (
                <FormattedMessage
                    defaultMessage="Restore Costume"
                    description="Menu bar item for restoring the last deleted costume."
                    id="gui.menuBar.restoreCostume"
                />
            );
        default:
            return (
                <FormattedMessage
                    defaultMessage="Restore"
                    description="Menu bar item for restoring the last deleted item in its disabled state."
                    id="gui.menuBar.restore"
                />
            );
        }
    }
    buildAboutMenu (onClickAbout) {
        if (!onClickAbout) return null;
        if (typeof onClickAbout === 'function') {
            return (
                <AboutButton onClick={onClickAbout} />
            );
        }
        return (
            <div
                className={classNames(
                    styles.menuBarItem,
                    styles.hoverable,
                    { [styles.active]: this.props.aboutMenuOpen }
                )}
                onMouseUp={this.props.onRequestOpenAbout}
            >
                <img
                    className={styles.aboutIcon}
                    src={aboutIcon}
                />
                <MenuBarMenu
                    className={classNames(styles.menuBarMenu)}
                    open={this.props.aboutMenuOpen}
                    place={this.props.isRtl ? 'right' : 'left'}
                    onRequestClose={this.props.onRequestCloseAbout}
                >
                    {onClickAbout.map(itemProps => (
                        <MenuItem
                            key={itemProps.title}
                            isRtl={this.props.isRtl}
                            onClick={this.wrapAboutMenuCallback(itemProps.onClick)}
                        >
                            {itemProps.title}
                        </MenuItem>
                    ))}
                </MenuBarMenu>
            </div>
        );
    }
    wrapAboutMenuCallback (callback) {
        return () => {
            callback();
            this.props.onRequestCloseAbout();
        };
    }
    render () {
        const saveNowMessage = (
            <FormattedMessage
                defaultMessage="Save now"
                description="Menu bar item for saving now"
                id="gui.menuBar.saveNow"
            />
        );
        const createCopyMessage = (
            <FormattedMessage
                defaultMessage="Save as a copy"
                description="Menu bar item for saving as a copy"
                id="gui.menuBar.saveAsCopy"
            />
        );
        const remixMessage = (
            <FormattedMessage
                defaultMessage="Remix"
                description="Menu bar item for remixing"
                id="gui.menuBar.remix"
            />
        );
        const newProjectMessage = (
            <FormattedMessage
                defaultMessage="New"
                description="Menu bar item for creating a new project"
                id="gui.menuBar.new"
            />
        );

        const remixButton = (
            <Button
                className={classNames(
                    styles.menuBarButton,
                    styles.remixButton
                )}
                iconClassName={styles.remixButtonIcon}
                iconSrc={remixIcon}
                onClick={this.handleClickRemix}
            >
                {remixMessage}
            </Button>
        );

        const aboutButton = this.buildAboutMenu(this.props.onClickAbout);

        const metadata = collectMetadata(
            this.props.vm,
            this.props.projectTitle,
            this.props.locale
        );
        if (this.props.onProjectTelemetryEvent) {
            this.props.onProjectTelemetryEvent('projectDidSave', metadata);
        }

        const showSaveNow = this.props.canSave;
        const showSaveAsCopy = this.props.canCreateCopy;
        const showRemix = this.props.canRemix;

        return (
            <Box
                className={classNames(
                    this.props.className,
                    styles.menuBar
                )}
            >
                <div className={styles.mainMenu}>
                    <div className={styles.fileGroup}>
                        {/* Scratch logo removed */}

                        {(this.props.canChangeTheme || this.props.canChangeLanguage) && (
                            <SettingsMenu
                                canChangeLanguage={this.props.canChangeLanguage}
                                canChangeTheme={this.props.canChangeTheme}
                                isRtl={this.props.isRtl}
                                onRequestClose={this.props.onRequestCloseSettings}
                                onRequestOpen={this.props.onClickSettings}
                                settingsMenuOpen={this.props.settingsMenuOpen}
                            />
                        )}

                        {this.props.canManageFiles && (
                            <div
                                className={classNames(
                                    styles.menuBarItem,
                                    styles.hoverable,
                                    { [styles.active]: this.props.fileMenuOpen }
                                )}
                                onMouseUp={this.props.onClickFile}
                            >
                                <img src={fileIcon} />
                                <span className={styles.collapsibleLabel}>
                                    <FormattedMessage
                                        defaultMessage="File"
                                        description="Text for file dropdown menu"
                                        id="gui.menuBar.file"
                                    />
                                </span>
                                <span>
                                    <img src={dropdownCaret} />
                                </span>
                                <MenuBarMenu
                                    className={classNames(styles.menuBarMenu)}
                                    open={this.props.fileMenuOpen}
                                    place={this.props.isRtl ? 'left' : 'right'}
                                    onRequestClose={this.props.onRequestCloseFile}
                                >
                                    <MenuSection>
                                        <MenuItem
                                            isRtl={this.props.isRtl}
                                            onClick={() => this.handleClickNew(this.props.canSave)}
                                        >
                                            {newProjectMessage}
                                        </MenuItem>
                                    </MenuSection>
                                    <MenuSection>
                                        {showSaveNow && (
                                            <MenuItem onClick={this.handleClickSave}>
                                                {saveNowMessage}
                                            </MenuItem>
                                        )}
                                        {showSaveAsCopy && (
                                            <MenuItem onClick={this.handleClickSaveAsCopy}>
                                                {createCopyMessage}
                                            </MenuItem>
                                        )}
                                        {showRemix && (
                                            <MenuItem onClick={this.handleClickRemix}>
                                                {remixMessage}
                                            </MenuItem>
                                        )}
                                    </MenuSection>
                                    <MenuSection>
                                        <MenuItem
                                            onClick={this.props.onStartSelectingFileUpload}
                                        >
                                            {this.props.intl.formatMessage(
                                                sharedMessages.loadFromComputerTitle
                                            )}
                                        </MenuItem>
                                        <SB3Downloader>
                                            {(className, downloadProjectCallback) => (
                                                <MenuItem
                                                    className={className}
                                                    onClick={this.getSaveToComputerHandler(
                                                        downloadProjectCallback
                                                    )}
                                                >
                                                    <FormattedMessage
                                                        defaultMessage="Save to your computer"
                                                        description="Menu bar item for downloading a project to your computer"
                                                        id="gui.menuBar.downloadToComputer"
                                                    />
                                                </MenuItem>
                                            )}
                                        </SB3Downloader>
                                    </MenuSection>
                                </MenuBarMenu>
                            </div>
                        )}

                        {/* Mode dropdown removed */}
                    </div>

                    {/* Search bar (project title input) removed */}

                    {this.props.authorUsername && !this.props.username && (
                        <AuthorInfo
                            className={styles.authorInfo}
                            imageUrl={this.props.authorThumbnailUrl}
                            projectTitle={this.props.projectTitle}
                            userId={this.props.authorId}
                            username={this.props.authorUsername}
                        />
                    )}

                    <div className={styles.menuBarItem}>
                        {this.props.canShare && (
                            this.props.isShowingProject && this.props.isUpdating ? (
                                <ProjectWatcher
                                    isUpdating={this.props.isUpdating}
                                    onDoneUpdating={this.props.onSeeCommunity}
                                >
                                    {waitForUpdate => (
                                        <ShareButton
                                            className={styles.menuBarButton}
                                            isShared={this.props.isShared}
                                            onClick={() => this.handleClickShare(waitForUpdate)}
                                        />
                                    )}
                                </ProjectWatcher>
                            ) : (
                                <ShareButton
                                    className={styles.menuBarButton}
                                    isShared={this.props.isShared}
                                    onClick={() => this.handleClickShare(() => {})}
                                />
                            )
                        )}
                        {this.props.showComingSoon && (
                            <MenuBarItemTooltip id="share-button">
                                <ShareButton className={styles.menuBarButton} />
                            </MenuBarItemTooltip>
                        )}
                        {this.props.canRemix && remixButton}
                    </div>
                </div>

                <Divider className={classNames(styles.divider)} />

                <div className={styles.fileGroup}>
                    <div
                        aria-label={this.props.intl.formatMessage(ariaMessages.debug)}
                        className={classNames(
                            styles.menuBarItem,
                            styles.noOffset,
                            styles.hoverable
                        )}
                        onClick={this.props.onOpenDebugModal}
                    >
                        <img
                            className={styles.helpIcon}
                            src={debugIcon}
                        />
                        <span className={styles.debugLabel}>
                            <FormattedMessage {...ariaMessages.debug} />
                        </span>
                    </div>
                </div>

                {/* Account/top‑right section already removed */}
                {aboutButton}
            </Box>
        );
    }
}

MenuBar.propTypes = {
    aboutMenuOpen: PropTypes.bool,
    accountMenuOpen: PropTypes.bool,
    authorId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    authorThumbnailUrl: PropTypes.string,
    authorUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    autoUpdateProject: PropTypes.func,
    canChangeLanguage: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    canCreateCopy: PropTypes.bool,
    canCreateNew: PropTypes.bool,
    canEditTitle: PropTypes.bool,
    canManageFiles: PropTypes.bool,
    canRemix: PropTypes.bool,
    canSave: PropTypes.bool,
    canShare: PropTypes.bool,
    className: PropTypes.string,
    confirmReadyToReplaceProject: PropTypes.func,
    currentLocale: PropTypes.string.isRequired,
    enableCommunity: PropTypes.bool,
    fileMenuOpen: PropTypes.bool,
    intl: intlShape,
    isRtl: PropTypes.bool,
    isShared: PropTypes.bool,
    isShowingProject: PropTypes.bool,
    isTotallyNormal: PropTypes.bool,
    isUpdating: PropTypes.bool,
    locale: PropTypes.string.isRequired,
    loginMenuOpen: PropTypes.bool,
    logo: PropTypes.string,
    mode1920: PropTypes.bool,
    mode1990: PropTypes.bool,
    mode2020: PropTypes.bool,
    mode220022BC: PropTypes.bool,
    modeMenuOpen: PropTypes.bool,
    modeNow: PropTypes.bool,
    onClickAbout: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.arrayOf(PropTypes.shape({
            title: PropTypes.string,
            onClick: PropTypes.func
        }))
    ]),
    onClickAccount: PropTypes.func,
    onClickFile: PropTypes.func,
    onClickLogin: PropTypes.func,
    onClickMode: PropTypes.func,
    onClickNew: PropTypes.func,
    onClickRemix: PropTypes.func,
    onClickSave: PropTypes.func,
    onClickSaveAsCopy: PropTypes.func,
    onClickSettings: PropTypes.func,
    onLogOut: PropTypes.func,
    onOpenDebugModal: PropTypes.func,
    onOpenRegistration: PropTypes.func,
    onOpenTipLibrary: PropTypes.func,
    onProjectTelemetryEvent: PropTypes.func,
    onRequestCloseAbout: PropTypes.func,
    onRequestCloseAccount: PropTypes.func,
    onRequestCloseFile: PropTypes.func,
    onRequestCloseLogin: PropTypes.func,
    onRequestCloseMode: PropTypes.func,
    onRequestCloseSettings: PropTypes.func,
    onRequestOpenAbout: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onSetTimeTravelMode: PropTypes.func,
    onShare: PropTypes.func,
    onStartSelectingFileUpload: PropTypes.func,
    projectTitle: PropTypes.string,
    renderLogin: PropTypes.func,
    sessionExists: PropTypes.bool,
    settingsMenuOpen: PropTypes.bool,
    shouldSaveBeforeTransition: PropTypes.func,
    showComingSoon: PropTypes.bool,
    username: PropTypes.string,
    userOwnsProject: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

MenuBar.defaultProps = {
    logo: scratchLogo,
    onShare: null
};

const mapStateToProps = (state, ownProps) => {
    const loadingState = state.scratchGui.projectState.loadingState;
    const user = state.session &&
        state.session.session &&
        state.session.session.user;
    return {
        aboutMenuOpen: aboutMenuOpen(state),
        accountMenuOpen: accountMenuOpen(state),
        currentLocale: state.locales.locale,
        fileMenuOpen: fileMenuOpen(state),
        isRtl: state.locales.isRtl,
        isUpdating: getIsUpdating(loadingState),
        isShowingProject: getIsShowingProject(loadingState),
        locale: state.locales.locale,
        loginMenuOpen: loginMenuOpen(state),
        modeMenuOpen: modeMenuOpen(state),
        projectTitle: state.scratchGui.projectTitle,
        sessionExists: state.session &&
            typeof state.session.session !== 'undefined',
        settingsMenuOpen: settingsMenuOpen(state),
        username: user ? user.username : null,
        userOwnsProject: ownProps.authorUsername && user ?
            ownProps.authorUsername === user.username : false,
        vm: state.scratchGui.vm,
        mode220022BC: isTimeTravel220022BC(state),
        mode1920: isTimeTravel1920(state),
        mode1990: isTimeTravel1990(state),
        mode2020: isTimeTravel2020(state),
        modeNow: isTimeTravelNow(state)
    };
};

const mapDispatchToProps = dispatch => ({
    autoUpdateProject: () => dispatch(autoUpdateProject()),
    onOpenTipLibrary: () => dispatch(openTipsLibrary()),
    onOpenDebugModal: () => dispatch(openDebugModal()),
    onClickAccount: () => dispatch(openAccountMenu()),
    onRequestCloseAccount: () => dispatch(closeAccountMenu()),
    onClickFile: () => dispatch(openFileMenu()),
    onRequestCloseFile: () => dispatch(closeFileMenu()),
    onClickLogin: () => dispatch(openLoginMenu()),
    onRequestCloseLogin: () => dispatch(closeLoginMenu()),
    onClickMode: () => dispatch(openModeMenu()),
    onRequestCloseMode: () => dispatch(closeModeMenu()),
    onRequestOpenAbout: () => dispatch(openAboutMenu()),
    onRequestCloseAbout: () => dispatch(closeAboutMenu()),
    onClickSettings: () => dispatch(openSettingsMenu()),
    onRequestCloseSettings: () => dispatch(closeSettingsMenu()),
    onClickNew: needSave => dispatch(requestNewProject(needSave)),
    onClickRemix: () => dispatch(remixProject()),
    onClickSave: () => dispatch(manualUpdateProject()),
    onClickSaveAsCopy: () => dispatch(saveProjectAsCopy()),
    onSeeCommunity: () => dispatch(setPlayer(true)),
    onSetTimeTravelMode: mode => dispatch(setTimeTravel(mode))
});

export default compose(
    injectIntl,
    MenuBarHOC,
    connect(
        mapStateToProps,
        mapDispatchToProps
    )
)(MenuBar);
